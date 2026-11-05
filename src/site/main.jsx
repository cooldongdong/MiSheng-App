import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import './home.css';
import { createAppTheme } from '../shared/theme.js';
import HomeApp from './HomeApp.jsx';

// 官網首頁與 /create、遊戲共用同一份 palette。
//
// 原本首頁自己 createTheme 一份 light-only 的 theme，於是三個入口裡只有它沒有深色模式
// ——結果是 2026-08-29 Dong 回報的那個 bug：系統是深色時，首頁是一片白，點進 /create
// 或 /demo 會閃一下。那不是「首頁少一個功能」，是三個入口對同一件事有兩種答案。
//
// 只有字體是首頁自己的。升成全站等於順手改掉 /create 與遊戲的字體——那是另一個決定。
//
// 2026-11 首頁改版從襯線換成黑體：插畫定成「疊紙」之後，粗黑體配圓潤的紙片才是同一個語氣；
// 襯線在這頁讀起來像出版品，跟手作紙雕的調性打架。
const theme = createAppTheme({
  typography: { fontFamily: '"Noto Sans TC", sans-serif' },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* defaultMode="system" ＝ 沒手動選過就跟隨作業系統，與另外兩個入口一致。
        重整時的第一格底色不在這裡決定——見 vite.config.js 的 firstPaintGround。 */}
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <HomeApp />
    </ThemeProvider>
  </StrictMode>
);
