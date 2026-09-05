import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

// **translateZ(0) 是給 iOS 的**（Dong 2026-09-05：滑到下一張時 title 與 NEXT 會晚
// 一點才出現，Android 沒有）。翻頁是靠祖先的 transform 做的，WebKit 在那段動畫期間
// 會重新光柵化底下的內容；這一塊有文字、按鈕與半透明底，算起來不便宜，於是晚一兩格
// 才畫出來。給它自己的合成層，翻頁就只是把同一張點陣圖搬位置。
// 同一種病的另外兩個病灶見 GradientLayer 與 ZoomableImage 的放大鈕。
const BottomBox = ({ children }) => {
  return (
    <Box
      sx={{
        width: '100%',
        padding: '7%',
        boxSizing: 'border-box',
        position: 'absolute',
        bottom: 0,
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </Box>
  );
};

BottomBox.propTypes = {
  children: PropTypes.node.isRequired,
};

export default BottomBox;
