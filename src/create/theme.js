// theme.js
// /create 的配色單一真相。
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
} from './flowLayout';

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
    divider: BG[100],
    background: {
      default: '#fff',
      paper: '#fafafa',
      // 浮在流程圖畫布上的工具列。半透明是刻意的——底下的節點要能透出來當空間線索
      overlay: 'rgba(255,255,255,0.94)',
    },
    ...flow(FLOW_PALETTE, MODEL_COLOR, MODEL_TINT, EDGE_COLOR),
  },
};

const dark = {
  palette: {
    mode: 'dark',
    text: { primary: BG[50], secondary: BG[200], disabled: BG[400] },
    divider: BG[800],
    background: { default: ABYSS, paper: BG[900], overlay: 'rgba(38,50,56,0.94)' },
    ...flow(FLOW_PALETTE_DARK, MODEL_COLOR_DARK, MODEL_TINT_DARK, EDGE_COLOR_DARK),
  },
};

const theme = createTheme({
  // colorSchemeSelector: 'data' → 產出 [data-mui-color-scheme="dark"] 選擇器，
  // 值走 CSS 變數。SVG 的 fill/stroke 吃不到 MUI 的 sx token，但吃得到 var(--mui-palette-*)，
  // 這是流程圖那 7 處 SVG 顏色不用在 JS 裡判斷 mode 的關鍵。
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: { light, dark },
});

export default theme;
