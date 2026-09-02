import { Box, Button } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PropTypes from 'prop-types';

// 有填 timer 的提示，鎖著的時候顯示倒數；沒填的維持原本的「解鎖提示 N」。
//
// **倒數只是換文案，不是把按鈕鎖住。** 手動解鎖與自動解鎖在解決不同的問題：
// 手動是「玩家承認自己要幫忙」（所以有確認對話框，那個摩擦是刻意的），
// 自動是「救卡住但不會開口的人」。做成「時間到才准開」會把安全網變成限制——
// 對有時間窗的實境遊戲很致命：只剩 20 分鐘的隊伍不能再等三分鐘才准看提示。
const LockedHintButton = ({ index, onUnlock, remainingMinutes }) => {
  const counting = typeof remainingMinutes === 'number' && remainingMinutes > 0;
  return (
    <Box sx={{ width: '100%' }}>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => onUnlock(index)}
        startIcon={<LockRoundedIcon />}
      >
        {counting
          ? `${remainingMinutes} 分鐘後自動解鎖提示 ${index + 1}`
          : `解鎖提示 ${index + 1}`}
      </Button>
    </Box>
  );
};

LockedHintButton.propTypes = {
  index: PropTypes.number.isRequired,
  onUnlock: PropTypes.func.isRequired,
  remainingMinutes: PropTypes.number,
};

export default LockedHintButton;
