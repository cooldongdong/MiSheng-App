import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.csv'], // 允許讀取 .csv 文件
  build: {
    rollupOptions: {
      // 兩個入口：index.html＝播放器（build-time 遊戲）、create.html＝即時轉化
      input: {
        main: resolve(root, 'index.html'),
        create: resolve(root, 'create.html'),
      },
    },
  },
});
