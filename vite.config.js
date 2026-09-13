import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { firstPaintGround } from './vite/firstPaintGround.js'
import { docsCleanUrls } from './vite/docsCleanUrls.js'

const root = dirname(fileURLToPath(import.meta.url));

// 拿手機測時才開的 https ＋ 區網監聽：`npm run dev:mobile`。
//
// **為什麼需要 https 才測得了。** 相機（`getUserMedia`）與分享（`navigator.share`）
// 都要 secure context，而區網是 `http://192.168.x.x`——兩個在那裡都拿不到，
// 於是手機上看到的會是「這個頁面不是用安全連線開啟的」，而那不是 bug，是環境。
//
// **為什麼綁環境變數而不是直接打開。** dev server 是好幾個並行 session 共用的
// （見 CLAUDE.local.md 那條 optimize-deps 汙染）。無條件改成 https 會把別人正在
// 跑的那台一起換掉，而症狀是他們的頁面突然連不上——所以預設行為一個字都不動。
const mobileHttps = process.env.VITE_MOBILE === '1';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(mobileHttps ? [basicSsl()] : []),
    firstPaintGround(),
    docsCleanUrls(),
  ],
  // allowedHosts：Vite 6 會擋掉 Host 標頭不在清單裡的請求（防 DNS rebinding），
  // 而 cloudflared 通道進來的 Host 是 xxx.trycloudflare.com——不放行的話它對後端
  // 每一次請求都拿到 400，症狀是「通道明明活著，手機卻打不開」。
  server: mobileHttps ? { host: true, allowedHosts: ['.trycloudflare.com'] } : {},
  assetsInclude: ['**/*.csv'], // 允許讀取 .csv 文件
  build: {
    rollupOptions: {
      // 三個入口：index.html＝官網首頁、demo.html＝播放器（build-time 遊戲）、create.html＝即時轉化
      input: {
        main: resolve(root, 'index.html'),
        demo: resolve(root, 'demo.html'),
        create: resolve(root, 'create.html'),
      },
    },
  },
});
