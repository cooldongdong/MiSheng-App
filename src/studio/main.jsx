import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import './create.css';
import theme from '../shared/theme.js';
import CreateApp from './CreateApp.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* defaultMode="system" ＝ 沒手動選過就跟隨作業系統；
        使用者按了 toggle 之後，MUI 自己寫進 localStorage 並記住。
        重整時的第一格底色不在這裡決定——見 create.html <head> 裡的行內 script。 */}
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <CreateApp />
    </ThemeProvider>
  </StrictMode>
);
