import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { firstPaintGround } from './vite/firstPaintGround.js'
import { docsCleanUrls } from './vite/docsCleanUrls.js'

const root = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), firstPaintGround(), docsCleanUrls()],
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
