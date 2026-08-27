import { Box } from '@mui/material';
import KeyboardCommandKeyRoundedIcon from '@mui/icons-material/KeyboardCommandKeyRounded';
import KeyboardReturnRoundedIcon from '@mui/icons-material/KeyboardReturnRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import BackspaceRoundedIcon from '@mui/icons-material/BackspaceRounded';
import PropTypes from 'prop-types';
import { isMacLike } from '../../hook/useAnswerShortcuts';

// 標在按鈕上的鍵位（Quiz 選項的數字、作答頁的快捷鍵、鍵位表）。
//
// **用 icon 不用 Unicode 字元**：⌘ ⏎ ↓ ⌫ 這些字在不同字型裡的寬高與側邊留白差很多，
// 而且常常 fallback 到別的字型——排出來一定歪，靠 margin 微調也只是把歪的地方換個
// 位置。MUI 的 icon 是同一套 24×24 的格線，縮到同一個 fontSize 就對齊了。
//
// **用外框不用底色**：這些鍵帽坐在三種不同的底上（選項按鈕淺色近白／深色是
// primary.main，輔助鈕透明底，鍵位表的面板底）。任何固定的 bgcolor 都會在其中一種
// 上糊掉。currentColor 跟著文字走，而文字對它自己的底本來就有對比。
const GLYPH_SX = { fontSize: 13 };

export const CmdGlyph = () => <KeyboardCommandKeyRoundedIcon sx={GLYPH_SX} />;
export const ReturnGlyph = () => <KeyboardReturnRoundedIcon sx={GLYPH_SX} />;
export const DownGlyph = () => <KeyboardArrowDownRoundedIcon sx={GLYPH_SX} />;
export const UpGlyph = () => <KeyboardArrowUpRoundedIcon sx={GLYPH_SX} />;
export const LeftGlyph = () => <KeyboardArrowLeftRoundedIcon sx={GLYPH_SX} />;
export const RightGlyph = () => <KeyboardArrowRightRoundedIcon sx={GLYPH_SX} />;
export const BackspaceGlyph = () => <BackspaceRoundedIcon sx={GLYPH_SX} />;

// Mac 用符號，其他平台寫字——⌘ 對 Windows 使用者不是提示，是謎題
export const ModifierGlyph = () =>
  isMacLike() ? <CmdGlyph /> : <Box component="span">Ctrl</Box>;

// minWidth 可以外面指定：鍵位表要一整欄等寬（不然框隨內容大小不一，左緣對齊、右緣
// 參差，內容各自置中也看不出來），標在按鈕上時則該貼著內容走。
const KeyCap = ({ children, side = 'left', minWidth = 20 }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      // 內容之間的距離交給 gap，不要各自加 margin——混排 icon 與文字時
      // （Ctrl + 箭頭）那是唯一排得齊的辦法
      gap: '2px',
      minWidth,
      height: 20,
      px: '5px',
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
  minWidth: PropTypes.number,
};

export default KeyCap;
