import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './home/home.css';
import HomeApp from './home/HomeApp.jsx';

// 官網首頁：對外的第一個畫面，沿用 /create 的淺色藍灰調（不吃 index.css 的深色遊戲底）
const theme = createTheme({
  palette: { mode: 'light' },
  typography: { fontFamily: '"Noto Serif TC", serif' },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HomeApp />
    </ThemeProvider>
  </StrictMode>
);
