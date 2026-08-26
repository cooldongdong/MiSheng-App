import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import './create/create.css';
import theme from './create/theme.js';
import CreateApp from './create/CreateApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 在 React 掛載前就把 data-mui-color-scheme 寫上去。
        少了這行，深色模式的使用者每次重整都會先閃一下白畫面——
        那一閃正是「太白刺眼」在最沒有防備的時候發生。 */}
    <InitColorSchemeScript attribute="data" />
    {/* defaultMode="system" ＝ 沒手動選過就跟隨作業系統；
        使用者按了 toggle 之後，MUI 自己寫進 localStorage 並記住。 */}
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <CreateApp />
    </ThemeProvider>
  </StrictMode>
);
