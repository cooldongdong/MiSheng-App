import { Box, Button, Stack } from '@mui/material';
import PropTypes from 'prop-types';
import { FILL_HINT, SKIP_HINT } from '../../hook/useAnswerShortcuts';

// 鍵位標在按鈕上，跟 Quiz 選項標數字同一個做法：標示本身就是說明，
// 不必另外寫一行「可以按 ⌘Enter」。
const KeyCap = ({ children }) => (
  <Box
    component="span"
    sx={{
      ml: 0.75,
      px: 0.6,
      borderRadius: 1,
      fontSize: '0.7rem',
      bgcolor: 'action.selected',
    }}
  >
    {children}
  </Box>
);

KeyCap.propTypes = { children: PropTypes.node.isRequired };

// 作答頁的兩顆試玩輔助鍵，只在 /create 出現（devTools），玩家端沒有。
//
// 做成畫面上的按鈕、而不是藏起來的快捷鍵：它們是「要用才用」的東西，
// 看得到就等於說明了自己，也不必為了它另外做一層設定開關。
//
// 為什麼「填入答案」擺在「略過」前面：略過會讓關卡進度與 {{變數}} 停在半路，
// 跟「回上一頁不會倒回狀態」的限制疊起來，就會出現「驗到後面發現變數是空的」。
// 填入答案走的是完整流程（成功文字、關卡狀態都照常產生），只是省掉打字，
// 所以它才是預設該伸手去拿的那一顆。
const AuthoringShortcuts = ({ onFill, fillLabel, onSkip }) => (
  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
    {onFill && (
      <Button size="small" color="inherit" onClick={onFill}>
        {fillLabel}
        <KeyCap>{FILL_HINT()}</KeyCap>
      </Button>
    )}
    {onSkip && (
      <Button size="small" color="inherit" onClick={onSkip}>
        略過這題
        <KeyCap>{SKIP_HINT()}</KeyCap>
      </Button>
    )}
  </Stack>
);

AuthoringShortcuts.propTypes = {
  onFill: PropTypes.func,
  fillLabel: PropTypes.string,
  onSkip: PropTypes.func,
};

export default AuthoringShortcuts;
