import PropTypes from 'prop-types';
import { Box } from '@mui/material';

// 手機外框。螢幕比例 9:19.5，寬度由外面給（height 跟著算）。
// 外框本身不吃 theme：手機在淺色、深色頁面上都是黑的。
const PhoneFrame = ({ width = 280, children, sx }) => (
  <Box
    sx={{
      width,
      aspectRatio: '9 / 19.5',
      p: '10px',
      borderRadius: '44px',
      bgcolor: '#0d0f12',
      boxShadow:
        '0 0 0 1.5px #2a2f36, 0 30px 60px -20px rgba(15,23,42,.45), 0 18px 36px -18px rgba(0,0,0,.5)',
      position: 'relative',
      flexShrink: 0,
      ...sx,
    }}
  >
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '34px',
        overflow: 'hidden',
        bgcolor: 'dialogue.surface',
        isolation: 'isolate',
        // 螢幕是 container：疊在畫面上的遮罩字級用 cqw，大手機小手機比例一致
        containerType: 'inline-size',
      }}
    >
      {children}
      {/* 動態島 */}
      <Box
        sx={{
          position: 'absolute',
          // 尺寸全用 cqw（螢幕寬的百分比）：寫死 px 的話，小手機上動態島會大到蓋住半個螢幕頂
          top: '3.5cqw',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '32%',
          height: '9cqw',
          borderRadius: 99,
          bgcolor: '#000',
          zIndex: 5,
        }}
      />
    </Box>
  </Box>
);

PhoneFrame.propTypes = {
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.object]),
  children: PropTypes.node,
  sx: PropTypes.object,
};

export default PhoneFrame;
