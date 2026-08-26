// theme.js
// 全站配色的單一真相——/create 與 /demo（遊戲）共用同一組 palette。
//
// 為什麼共用：遊戲在 /create 裡是渲染在這個 ThemeProvider 底下的。兩邊各有一份 theme
// 的話，遊戲的 MUI 元件會拿到 /create 的值、遊戲自己寫死的底色卻不會跟著換——那正是
// 「深色模式下底部 icon 顏色很奇怪」的成因：背景寫死 #f8f9fa（淺），icon 卻吃到了深色
// 模式的 text.secondary（淺灰），淺灰畫在近白上。
//
// 為什麼顏色不寫在元件裡：深色模式要的不是「另一組顏色」，是**同一個語意在兩種底色下各有一個值**。
// 只要元件端留下的是語意（text.secondary、divider、background.paper），值就能整組換掉而不用碰元件。
// 反過來，元件裡每多一個 hex，深色模式就多一個要手動維護的分支——這正是本次重構要清掉的東西
// （動工前實測：src/create/ 有 115 處寫死顏色，其中 96 處只是 chrome，不帶任何語意）。
//
// 為什麼沿用藍灰而不另挑一組中性深色：藍灰是這個專案既有的主色
// （遊戲殼 ThemeColorLayer 預設 #37474F、官網 HomeApp 的 ACCENT 同色）。
// 深色模式把同一條 ramp 上下對摺，三個入口才會看起來像同一個產品；換色相等於讓
// 唯一的品牌訊號在深色下消失。

import { createTheme } from '@mui/material';
import {
  MODEL_COLOR,
  MODEL_TINT,
  MODEL_COLOR_DARK,
  MODEL_TINT_DARK,
  EDGE_COLOR,
  EDGE_COLOR_DARK,
  FLOW_PALETTE,
  FLOW_PALETTE_DARK,
} from './create/flowLayout';

// MUI Blue Grey，標階數是為了讓「哪兩階被合併了」看得見
const BG = {
  50: '#eceff1',
  100: '#cfd8dc',
  200: '#b0bec5',
  300: '#90a4ae',
  400: '#78909c',
  500: '#607d8b',
  600: '#546e7a',
  700: '#455a64',
  800: '#37474f',
  900: '#263238',
};

// 比 900 再深一階，只用在深色模式最底層：paper(900) 要浮得起來就需要一個比它更暗的底。
// 直接拿 900 當 default 會讓面板與背景黏成一片。
const ABYSS = '#1c2429';

// flowLayout 那組（CLI 也在用的同一份）攤進 palette。
// 兩種模式的結構一模一樣，差別只在餵進來的是哪一組常數。
const flow = (p, modelColor, modelTint, edge) => ({
  canvas: { bg: p.canvas, dot: p.dot, fallback: p.fallback, fallbackTint: p.fallbackTint, surface: p.surface },
  model: { color: modelColor, tint: modelTint },
  edge,
  node: { ink: p.ink, sub: p.sub, anchorInk: p.anchorInk, anchorSub: p.anchorSub, anchorBadge: p.anchorBadge },
  error: { main: p.dangerMain, surface: p.dangerSurface },
});

// 文字灰原本有 7 階（900/800/600/500/400/300/200），但 7 階灰沒有 7 種意思——
// 例如 #546e7a(600) 與 #607d8b(500) 差不到 3% 明度，那是同一個東西被寫了兩次。
// 合併成 MUI 既有的三階，順便把最淡的一階往上提（#90a4ae 在白底只有 2.6:1，是實際讀不清楚的）。
const light = {
  palette: {
    mode: 'light',
    text: { primary: BG[900], secondary: BG[600], disabled: BG[400] },
    // primary ＝ 主要動作（按鈕、連結）；secondary ＝ 你現在在哪（選中、啟用中）。
    // 分成兩個角色是因為 A 案實測有個功能性缺陷：primary 用藍灰墨的話，深色模式下
    // 「選中」(#90a4ae) 與「未選中」(#78909c) 只差一階明度，使用者分不出在哪一頁。
    // 把狀態交給鏽橘，按鈕才留得住藍灰墨那個近黑的質感。
    primary: { main: BG[800], contrastText: '#fff' },
    secondary: { main: '#b2591f', contrastText: '#fff' },
    divider: BG[100],
    background: {
      default: '#fff',
      paper: '#fafafa',
      // 浮在流程圖畫布上的工具列。半透明是刻意的——底下的節點要能透出來當空間線索
      overlay: 'rgba(255,255,255,0.94)',
    },
    ...flow(FLOW_PALETTE, MODEL_COLOR, MODEL_TINT, EDGE_COLOR),
    game: { frame: '#d9d9d9', bg: '#eee', nav: '#f8f9fa' },
  },
};

const dark = {
  palette: {
    mode: 'dark',
    text: { primary: BG[50], secondary: BG[200], disabled: BG[400] },
    primary: { main: BG[300], contrastText: ABYSS },
    secondary: { main: '#e08a4a', contrastText: ABYSS },
    divider: BG[800],
    background: { default: ABYSS, paper: BG[900], overlay: 'rgba(38,50,56,0.94)' },
    ...flow(FLOW_PALETTE_DARK, MODEL_COLOR_DARK, MODEL_TINT_DARK, EDGE_COLOR_DARK),
    // 遊戲外殼。frame 是 #root（桌機上遊戲兩側的襯底）、bg 是遊戲頁面底、nav 是底部導覽。
    // 關卡卡片（MissionItem 的 #37474F）刻意兩種模式都不動：它在淺色是「深卡片浮在淺頁」，
    // 在深色剛好變成「亮一階的卡片浮在更深的頁」，同一個值兩邊都成立。
    game: { frame: '#141a1e', bg: '#1c2429', nav: '#263238' },
  },
};

const theme = createTheme({
  // colorSchemeSelector: 'data' → 產出 [data-mui-color-scheme="dark"] 選擇器，
  // 值走 CSS 變數。SVG 的 fill/stroke 吃不到 MUI 的 sx token，但吃得到 var(--mui-palette-*)，
  // 這是流程圖那 7 處 SVG 顏色不用在 JS 裡判斷 mode 的關鍵。
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: { light, dark },
  components: {
    MuiButton: {
      styleOverrides: {
        // 遊戲的主要動作鈕（NextButton / EndIconButton）用的是 color="inherit"，
        // MUI 對它給的是 grey[300] / grey[800]。淺色模式下那是一塊近白的膠囊，疊在
        // 遊戲插圖上剛好；深色模式下卻變成 #424242 —— 一塊跟品牌毫無關係的中性暗灰，
        // 而且在深底上幾乎看不見。這裡只改深色那一半，淺色維持原樣。
        containedInherit: ({ theme }) =>
          theme.applyStyles('dark', {
            backgroundColor: theme.vars.palette.primary.main,
            color: theme.vars.palette.primary.contrastText,
            '&:hover': { backgroundColor: theme.vars.palette.primary.light },
          }),
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        // 「現在在哪一頁」屬於狀態，走 secondary（見 palette 的註解）
        root: ({ theme }) => ({
          '&.Mui-selected': { color: theme.vars.palette.secondary.main },
        }),
      },
    },
  },
});

export default theme;
