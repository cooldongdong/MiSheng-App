import { Button, Stack } from '@mui/material';
import PropTypes from 'prop-types';
import KeyCap, { ModifierGlyph, ReturnGlyph, DownGlyph } from './KeyCap';

// 作答頁的兩顆試玩輔助鍵，只在 /create 出現（devTools），玩家端沒有。
//
// 做成畫面上的按鈕、而不是藏起來的快捷鍵：它們是「要用才用」的東西，
// 看得到就等於說明了自己，也不必為了它另外做一層設定開關。
//
// 文字用 dialogue.onSurface 而不是 color="inherit"：這兩顆坐的是遊戲對話區那層固定的
// 深墨底（palette.dialogue.surface），不是頁面底。inherit 在淺色模式下會拿到深色文字，
// 深字畫在深底上等於沒有——跟輸入框那個「白底孤島」是同一種錯，只是方向相反。
//
// 為什麼「填入答案」擺在「略過」前面：略過會讓關卡進度與 {{變數}} 停在半路，
// 跟「回上一頁不會倒回狀態」的限制疊起來，就會出現「驗到後面發現變數是空的」。
// 填入答案走的是完整流程（成功文字、關卡狀態都照常產生），只是省掉打字，
// 所以它才是預設該伸手去拿的那一顆。
const SHORTCUT_SX = {
  color: 'dialogue.onSurface',
  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
};

const AuthoringShortcuts = ({ onFill, fillLabel, onSkip }) => (
  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
    {onFill && (
      <Button size="small" sx={SHORTCUT_SX} onClick={onFill}>
        {fillLabel}
        <KeyCap side="right">
          <ModifierGlyph />
          <ReturnGlyph />
        </KeyCap>
      </Button>
    )}
    {onSkip && (
      <Button size="small" sx={SHORTCUT_SX} onClick={onSkip}>
        略過這題
        <KeyCap side="right">
          <ModifierGlyph />
          <DownGlyph />
        </KeyCap>
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
