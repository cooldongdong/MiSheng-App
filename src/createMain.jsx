import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './index.css';
import CreateApp from './create/CreateApp.jsx';

// index.css 帶深色底，但轉化頁是表單介面，固定用淺色主題才讀得清楚
const theme = createTheme({ palette: { mode: 'light' } });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CreateApp />
    </ThemeProvider>
  </StrictMode>
);
