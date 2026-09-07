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
  clearShareBroken,
  isShareBroken,
  markShareBroken,
  pendingCount,
  policySnapshot,
  shareEvents,
} from '../../game/telemetry';
import {
  probeShareFile,
  probeShareText,
  shareEnvReport,
} from '../../game/shareDiag';

// 現場診斷只在 ?diag=1 時出現（同 DiagOverlay 的慣例）
const wantsDiag = () => {
  try {
    return new URLSearchParams(window.location.search).get('diag') === '1';
  } catch {
    return false;
  }
};

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
  const { gameId, eventCount, configData } = useContext(GameContext);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  // 探測會 new 一個 File 出來，不該每次重繪都跑；而它的答案在一次開啟裡不會變
  const [canShare, setCanShare] = useState(false);

  const [shareHidden, setShareHidden] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCanShare(canShareExport());
    setPending(pendingCount(gameId));
    // 「上次失敗過所以被收起來」跟「這台裝置本來就沒有分享功能」要分開：
    // 前者要給一條回頭路，後者沒有東西可以回頭
    setShareHidden(isShareBroken() && !!navigator.share);
  }, [open]);

  const recordUrl = String(configData?.[0]?.recordUrl || '').trim();

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
  // 分享跟另外兩個不一樣：它會回傳「為什麼不行」，而且**使用者按取消不算失敗**
  //（reason 是 null）。
  //
  // **失敗一次就不再提供這個選項，並且當場改用下載。** 理由是 Dong 2026-09-06 的
  // 一句話：「不要做一個使用者無法用的功能」。Android Chrome 上 canShare() 回 true
  // 但送出必定失敗——探測不可信，就改用事實：失敗過的裝置以後不再看到這顆鈕。
  //
  // 不讓這一按變成白費：當場接著走下載，並且**把發生的事講出來**。上一版是靜靜
  // 退回下載（圖示畫著分享、做的卻是下載），那個問題出在沒說，不是出在退回。
  const runShare = async (event) => {
    const trusted = event?.isTrusted !== false;
    setBusy(true);
    try {
      const { ok, reason } = await shareEvents(gameId);
      if (ok) {
        setStatus('已送出');
        return;
      }
      // 取消：他自己按的，什麼都不用做也不用說
      if (!reason) return;

      markShareBroken();
      setCanShare(false);
      downloadEvents(gameId);
      // 「Permission denied」代表是**伺服器的權限政策**關掉的，跟裝置無關——
      // 那句話對使用者沒有意義，但那一行政策快照對修的人有意義，所以一起印。
      const policy = policySnapshot();
      setStatus(
        `這台裝置擋掉了分享（${reason}${trusted ? '' : '／補發的點擊'}` +
          `${policy ? `／${policy}` : ''}），已改用下載。找不到檔案的話用「複製」。`
      );
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: recordUrl ? 0.5 : 2 }}>
            {eventCount} 筆 · 只存在這台裝置上，換一支手機或清掉瀏覽器資料就不見了
          </Typography>

          {/*
            **創作者要能看出「自動送出到底有沒有在動」。** 送出是背景行為，
            沒有任何畫面——部署完之後想確認它有沒有生效，唯一的辦法本來是
            去翻試算表（而且要等 30 秒或關掉分頁才會送）。

            這一行把它變成看得見的：已送幾筆、還積著幾筆。積著的數字一直不降，
            就是網址填錯或那台裝置連不出去。

            沒設定 recordUrl 的遊戲不顯示——那不是「壞掉」，是根本沒開這個功能。
          */}
          {recordUrl && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              自動送出：已送 {Math.max(0, eventCount - pending)} 筆
              {pending > 0 ? `，還有 ${pending} 筆排隊中` : '，全部送完了'}
            </Typography>
          )}

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

          {shareHidden && !canShare && (
            <Button
              size="small"
              sx={{ mt: 1 }}
              disabled={busy}
              onClick={() => {
                clearShareBroken();
                setShareHidden(false);
                setCanShare(canShareExport());
                setStatus('');
              }}
            >
              再試一次分享（上次失敗了）
            </Button>
          )}

          {status && (
            <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
              {status}
            </Typography>
          )}

          {wantsDiag() && (
            <>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={async () => setStatus(await probeShareText())}
                >
                  測：分享文字
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={async () => setStatus(await probeShareFile())}
                >
                  測：分享檔案
                </Button>
                <Button size="small" onClick={() => setStatus(shareEnvReport())}>
                  環境
                </Button>
              </Stack>
              <Typography
                variant="caption"
                component="pre"
                sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                color="text.secondary"
              >
                {status}
              </Typography>
            </>
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
