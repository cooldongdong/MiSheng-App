import PropTypes from 'prop-types';
import { keyframes } from '@emotion/react';
import { Box, Typography } from '@mui/material';

// 檢查通過之後不再停在檢查頁，而是直接進三欄——中間就少了一個「有東西在動」的畫面。
// 讀 7 張 CSV 要幾秒，沒有這一頁的話會是一段白畫面，看起來像當掉了。

const breathe = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.94); }
  50%      { opacity: 1;    transform: scale(1); }
`;

const LoadingScreen = ({ label = '' }) => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      px: 2,
    }}
  >
    <Box
      component="img"
      src="/MiSheng-logo-w.svg"
      alt=""
      aria-hidden
      sx={{
        width: 72,
        height: 72,
        // 不要加 filter。這顆 logo 是「#37474F 的圖形 ＋ 白色底方塊」，
        // 檔名的 -w 指的是白底不是白圖——它的圖形色本來就是這個專案的主色。
        // 加了 invert() 會把那塊白底變成灰的，畫面上就多出一個方塊。
        animation: `${breathe} 1.8s ease-in-out infinite`,
        // 會動的東西對某些人是負擔，系統設定說不要動就不要動
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          opacity: 1,
          transform: 'none',
        },
      }}
    />
    <Box sx={{ textAlign: 'center' }}>
      <Typography role="status" aria-live="polite" sx={{ color: '#37474f' }}>
        {label ? `正在讀取${label}` : '讀取中'}
      </Typography>
      {/* 講清楚「慢是正常的」，比只放一個轉圈更能讓人願意等 */}
      <Typography variant="caption" sx={{ color: '#90a4ae', mt: 0.5, display: 'block' }}>
        表格比較大時要幾秒
      </Typography>
    </Box>
  </Box>
);

LoadingScreen.propTypes = {
  label: PropTypes.string,
};

export default LoadingScreen;
