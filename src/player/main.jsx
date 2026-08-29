import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import './index.css';
import theme from '../shared/theme.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 與 /create 共用同一組 theme。這裡不放外觀切換的 UI——遊戲畫面沒有適合掛開關
        的地方，硬塞會變成玩家在解謎時看到一顆跟遊戲無關的按鈕。所以 /demo 純粹
        跟隨系統；要手動指定的人在 /create 那邊有開關。 */}
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
