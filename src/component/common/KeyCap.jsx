import { Box } from '@mui/material';
import PropTypes from 'prop-types';

// 標在按鈕上的鍵位（Quiz 選項的數字、作答頁的 ⌘⏎ / ⌘↓）。
//
// 用外框而不是底色：這些鍵帽坐在兩種完全不同的按鈕上——選項按鈕在淺色模式是近白、
// 深色模式被 theme 換成 primary.main（見 theme 的 containedInherit），輔助鈕又是
// 透明底。任何一個固定的 bgcolor 都會在其中一種底上糊掉（實測深色模式下的
// action.selected 就是這樣）。currentColor 跟著文字走，而文字對它自己的底本來就有
// 對比，所以三種底都成立。
//
// 尺寸寫死而不是靠行高：內容可能是 '1'、'⌘⏎'、'Ctrl+↵'，字元寬高差很多，
// 沒有固定高度與 inline-flex 的話每一顆都會坐在不同的位置上。
const KeyCap = ({ children, side = 'left' }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      px: 0.5,
      [side === 'left' ? 'mr' : 'ml']: 0.75,
      border: '1px solid',
      borderColor: 'currentColor',
      borderRadius: '4px',
      fontSize: '0.7rem',
      lineHeight: 1,
      // 鍵位是註腳，不該跟按鈕上的字搶
      opacity: 0.6,
    }}
  >
    {children}
  </Box>
);

KeyCap.propTypes = {
  children: PropTypes.node.isRequired,
  // 標在文字前面（選項的編號）還是後面（快捷鍵）
  side: PropTypes.oneOf(['left', 'right']),
};

export default KeyCap;
