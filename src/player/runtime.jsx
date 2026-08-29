import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import './index.css';
import theme from '../shared/theme.js';
import RuntimeApp from './RuntimeApp.jsx';

// 獨立播放器的入口。跟 main.jsx（/demo）唯一的差別是它掛 RuntimeApp——
// 資料在執行時才讀，所以這一份 build 出來可以配任何一個遊戲資料夾。
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <RuntimeApp />
    </ThemeProvider>
  </StrictMode>
);
