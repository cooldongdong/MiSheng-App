import { useContext } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import { GameContext } from '../../store/game-context';
import { downloadEvents } from '../../game/telemetry';

// 把這一場的行為紀錄存成一個 JSON 檔。
//
// **為什麼是「下載」而不是「上傳」**：試玩階段要的是完整保真——五個人、五個檔，
// 零基礎設施、零廠商、零個資問題，而且不必擔心哪一則事件沒送到。正式活動要的
// 「大量但殘缺」是另一條路（Worker 中繼到創作者的試算表），兩者站在同一塊地基上。
//
// **沒有事件就不顯示**：一顆按下去得到空檔的按鈕只會讓人以為壞了。而 previewMode
// （/create）本來就不記錄，所以那邊自然也不會出現——不必另外判斷。
//
// 不給確認對話框：下載一個自己的檔案不可逆的地方是零。
const ExportEventsButton = () => {
  const { gameId, eventCount } = useContext(GameContext);

  if (!gameId || !eventCount) return null;

  return (
    <Tooltip title={`下載這場的紀錄（${eventCount} 筆）`}>
      <IconButton
        size="small"
        color="inherit"
        onClick={() => downloadEvents(gameId)}
      >
        <FileDownloadRoundedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default ExportEventsButton;
