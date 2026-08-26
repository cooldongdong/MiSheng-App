import PropTypes from 'prop-types';
import { keyframes } from '@emotion/react';
import { Box, Typography } from '@mui/material';
import BrandMark from './BrandMark.jsx';

// 檢查通過之後不再停在檢查頁，而是直接進三欄——中間就少了一個「有東西在動」的畫面。
// 讀 7 張 CSV 要幾秒，沒有這一頁的話會是一段白畫面，看起來像當掉了。
//
// 它是**蓋在畫面上的遮罩**，不是一個獨立的畫面。原因：載入畫面與三欄是兩棵完全
// 不同的樹，硬切的那一格要一次掛上三欄＋遊戲＋流程圖（demo 是 1272 個 SVG 文字
// 節點），使用者會看到半畫好的狀態閃一下。改成遮罩之後，那一格發生在遮罩底下，
// 等底下安定了才淡出。

const breathe = keyframes`
  0%, 100% { opacity: 0.35; transform: scale(0.94); }
  50%      { opacity: 1;    transform: scale(1); }
`;

const LoadingScreen = ({ label = '', fadingOut = false }) => (
  <Box
    sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      bgcolor: 'background.default',
      opacity: fadingOut ? 0 : 1,
      transition: 'opacity 260ms ease',
      // 淡出中不要擋住底下已經可以用的介面
      pointerEvents: fadingOut ? 'none' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      px: 2,
    }}
  >
    {/* 不要改回 <img src="/MiSheng-logo-w.svg"> 再套 filter。那顆檔案帶一塊白色底方塊，
        淺色模式下看不見、深色模式下會變成畫面最亮的東西；而 invert() 只會把它變成灰方塊。
        BrandMark 是同一個圖形去掉底方塊、改吃 currentColor 的版本。 */}
    <BrandMark
      size={72}
      sx={{
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
      <Typography role="status" aria-live="polite">
        {label ? `正在讀取${label}` : '讀取中'}
      </Typography>
      {/* 講清楚「慢是正常的」，比只放一個轉圈更能讓人願意等 */}
      <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
        表格比較大時要幾秒
      </Typography>
    </Box>
  </Box>
);

LoadingScreen.propTypes = {
  label: PropTypes.string,
  fadingOut: PropTypes.bool,
};

export default LoadingScreen;
