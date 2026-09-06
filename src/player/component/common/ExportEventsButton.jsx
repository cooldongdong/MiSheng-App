import { useContext, useState } from 'react';
import { IconButton, Snackbar, Tooltip } from '@mui/material';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { GameContext } from '../../store/game-context';
import {
  canShareExport,
  copyEvents,
  downloadEvents,
  shareEvents,
} from '../../game/telemetry';

// 把這一場的行為紀錄交出去。
//
// **為什麼是「下載」而不是「上傳」**：試玩階段要的是完整保真——五個人、五個檔，
// 零基礎設施、零廠商、零個資問題，而且不必擔心哪一則事件沒送到。正式活動要的
// 「大量但殘缺」是另一條路（Worker 中繼到創作者的試算表），兩者站在同一塊地基上。
//
// **為什麼有兩顆鈕**：原本只有下載，而它在 app 內建的瀏覽器裡是死的——Dong
// 2026-09-06 實測 iOS 的 Google app 按了完全沒反應（Safari 與 Android Chrome 正常）。
// 那正是活動當天最可能的環境：玩家從 LINE 或 QR 進來，iOS 上就是內建瀏覽器。
//
//   左邊那顆＝**分享**（手機）或**下載**（桌機），看這台裝置給不給 navigator.share
//   右邊那顆＝**複製**，一定會動的保底
//
// 複製留著而不是只做分享，是因為分享需要 https，而區網測試與部分內建瀏覽器都沒有。
// 一條「比較好但不一定在」的路，不能取代一條「難看但一定在」的路。
//
// **沒有事件就不顯示**：一顆按下去得到空檔的按鈕只會讓人以為壞了。而 previewMode
// （/create）本來就不記錄，所以那邊自然也不會出現——不必另外判斷。
//
// 不給確認對話框：把自己的紀錄交出去，不可逆的地方是零。
const ExportEventsButton = () => {
  const { gameId, eventCount } = useContext(GameContext);
  const [toast, setToast] = useState('');

  if (!gameId || !eventCount) return null;

  // 每次點擊都重問一次，不在 render 時算：使用者可能中途才裝好支援，
  // 而且這個判斷會 new 一個 File 出來探測，不該每次重繪都跑。
  const handlePrimary = async () => {
    if (canShareExport()) {
      const shared = await shareEvents(gameId);
      // 沒送出（取消，或這台裝置臨時不給）就安靜退回下載，不要對他報錯
      if (shared) return;
    }
    downloadEvents(gameId);
  };

  const handleCopy = async () => {
    const ok = await copyEvents(gameId);
    // **複製一定要給回饋**：它是唯一按下去畫面完全沒有變化的動作，
    // 沒有回饋的話「成功」跟「壞掉」長得一模一樣。
    setToast(ok ? '紀錄已複製，可以直接貼上' : '複製失敗，改用左邊那顆試試');
  };

  const primaryLabel = canShareExport() ? '分享' : '下載';

  return (
    <>
      <Tooltip title={`${primaryLabel}這場的紀錄（${eventCount} 筆）`}>
        <IconButton size="small" color="inherit" onClick={handlePrimary}>
          {canShareExport() ? (
            <IosShareRoundedIcon fontSize="small" />
          ) : (
            <FileDownloadRoundedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <Tooltip title={`複製這場的紀錄（${eventCount} 筆）`}>
        <IconButton size="small" color="inherit" onClick={handleCopy}>
          <ContentCopyRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Snackbar
        open={!!toast}
        onClose={() => setToast('')}
        autoHideDuration={2600}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // 導覽列在底部，訊息要浮在它上面才看得到
        sx={{ bottom: { xs: 72 } }}
      />
    </>
  );
};

export default ExportEventsButton;
