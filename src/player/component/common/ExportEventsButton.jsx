import { useContext, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { GameContext } from '../../store/game-context';
import {
  canShareExport,
  copyEvents,
  downloadEvents,
  shareEvents,
} from '../../game/telemetry';

// 這一場的遊戲紀錄——一顆圖示，點開是一張小面板。
//
// **為什麼收成一顆。** 上一版把「分享」與「複製」拆成兩顆平行的圖示放在頂部，
// 那是用兩個位置去講一件次要的事——它是遊戲結束才用得到的東西，不該跟「重新開始」
// 「切換外觀」搶同一排（Dong 2026-09-06：「右上的按鈕變得太多了」）。
//
// **為什麼不用分享圖示當入口。** 分享符號在遊戲畫面上會被讀成「把這個遊戲分享給
// 朋友」，而不是「交出我的紀錄」（同上）。所以入口用收據，分享只是面板裡的一個動作。
//
// **為什麼三個動作都攤開來給他看，而不是自動挑一個。** 因為沒有一條路在每個環境
// 都會動，而失敗是安靜的：
//
// | 環境 | 分享 | 下載 |
// | iOS Safari | ✅ | ✅ |
// | iOS app 內建瀏覽器 | ？ | ❌ 按了完全沒反應 |
// | Android Chrome | ❌ 探測說可以、實際被擋 | ✅ |
// | Firefox（Android）| ❌ 沒有這個 API | ✅ |
//
// 上一版讓程式自己挑「最好的那條」，結果是 Android 上圖示畫著分享、按下去卻在下載
// ——**介面說的跟做的不一樣**。攤開來反而誠實：哪一條不行，他自己按下一條。
//
// 複製永遠留著，它是唯一在每個環境都會動的（clipboard API 加 execCommand 兩條路）。
//
// **回饋寫在面板裡，不用 Snackbar。** 上一版用 Snackbar，實測在手機上根本沒出現
// （Dong 2026-09-06：複製成功、貼出來是完整的 JSON，但沒有跳訊息）——它得跟導覽列
// 搶位置與堆疊脈絡。面板本來就在畫面正中間，把結果寫在按鈕底下最穩。
//
// **沒有事件就不顯示**：一顆按下去得到空檔的按鈕只會讓人以為壞了。而 previewMode
// （/create）本來就不記錄，所以那邊自然也不會出現——不必另外判斷。
const ExportEventsButton = () => {
  const { gameId, eventCount } = useContext(GameContext);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  // 探測會 new 一個 File 出來，不該每次重繪都跑；而它的答案在一次開啟裡不會變
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (open) setCanShare(canShareExport());
  }, [open]);

  if (!gameId || !eventCount) return null;

  const run = async (fn, okText, failText) => {
    setBusy(true);
    try {
      setStatus((await fn()) ? okText : failText);
    } finally {
      setBusy(false);
    }
  };

  // 分享跟另外兩個不一樣：它會回傳「為什麼不行」，而且**使用者按取消不算失敗**
  //（reason 是 null）。上一版一律說「這台裝置擋掉了分享」——對取消的人來說那是謊話。
  //
  // 真的不行的時候把錯誤名稱寫出來。這一格我已經猜錯兩次（先猜 iOS、再猜檔案型別
  // 白名單），與其再猜第三次，不如讓畫面直接說它是什麼。
  const runShare = async (event) => {
    // **這一下是真的手指按的，還是我們自己補出來的？**
    //
    // navigator.share 需要「使用者手勢」，而 useTouchClickRecovery 會在 Chrome
    // 吞掉 click 時**自己 dispatch 一個 MouseEvent 補回去**——那種 click 的
    // isTrusted 是 false，帶不動任何需要手勢的 API。Android Chrome 回的
    // NotAllowedError 正是「沒有手勢」的標準錯誤（Dong 2026-09-06 實測）。
    //
    // 所以把它一起報出來：真手勢還失敗，跟假手勢失敗，是兩個完全不同的問題，
    // 而它們的錯誤名稱一模一樣。**與其再猜第三次，不如讓畫面直接分辨。**
    const trusted = event?.isTrusted !== false;
    setBusy(true);
    try {
      const { ok, reason } = await shareEvents(gameId);
      if (ok) setStatus('已送出');
      else if (reason)
        setStatus(
          `分享沒有成功（${reason}${trusted ? '' : '／補發的點擊'}），改用下面兩個`
        );
      else setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    setStatus('');
  };

  return (
    <>
      <Tooltip title={`這場的遊戲紀錄（${eventCount} 筆）`}>
        <IconButton size="small" color="inherit" onClick={() => setOpen(true)}>
          <ReceiptLongRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* data-no-swipe：面板開著的時候上下滑不該翻頁（同 FullTextDialog） */}
      <Dialog data-no-swipe open={open} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>這場的遊戲紀錄</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {eventCount} 筆 · 只存在這台裝置上，換一支手機或清掉瀏覽器資料就不見了
          </Typography>

          <Stack spacing={1}>
            {canShare && (
              <Button
                variant="contained"
                disabled={busy}
                startIcon={<IosShareRoundedIcon />}
                onClick={runShare}
              >
                傳送檔案
              </Button>
            )}
            <Button
              variant={canShare ? 'outlined' : 'contained'}
              disabled={busy}
              startIcon={<ContentCopyRoundedIcon />}
              onClick={() =>
                run(
                  () => copyEvents(gameId),
                  '已複製，可以直接貼上',
                  '複製失敗，改用「存成檔案」'
                )
              }
            >
              複製
            </Button>
            <Button
              variant="outlined"
              disabled={busy}
              startIcon={<FileDownloadRoundedIcon />}
              onClick={() =>
                run(
                  async () => {
                    downloadEvents(gameId);
                    // 下載沒有辦法知道成不成功——瀏覽器不會回報，被擋掉時也是安靜的。
                    // 所以這裡不敢說「已下載」，只講我們做了什麼。
                    return true;
                  },
                  '已送出下載，找不到的話改用「複製」',
                  ''
                )
              }
            >
              存成檔案
            </Button>
          </Stack>

          {status && (
            <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
              {status}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>關閉</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExportEventsButton;
