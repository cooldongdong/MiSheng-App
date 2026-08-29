import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { existsSync, renameSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { firstPaintGround } from './vite/firstPaintGround.js'

const root = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(root, 'dist-player');

// 產線 2 的成品：一份**只有播放器**的資料夾。
//
// 跟主 build（vite.config.js）刻意分成兩個設定檔，因為它們有兩個不能共存的差異：
//   1. base —— 這一份會被丟到 user.github.io/**某個 repo 名**/ 底下，
//      所以資產路徑必須是相對的；misheng.app 是站台根目錄，用絕對路徑才對。
//   2. 入口 —— 這一份不能含官網與 /create。那不只是「檔案大一點」的問題：
//      使用者的 zip 裡出現一個能貼別人試算表的工具，語意上是錯的。
//
// 「它到底含了什麼」由 eslint 的依賴方向規則保證（player 不得 import studio／site），
// 不是靠這裡的 input 清單——input 只決定從哪裡開始拉，拉到什麼是 import 決定的。

// Vite 用入口 html 的檔名當輸出檔名，但靜態主機要的是 index.html。
//
// 在 closeBundle 動檔案而不是在 generateBundle 改 bundle 的 key：Vite 的 HTML 是由它
// 自己的內建 plugin 在更後面才寫出去的，那時我的 generateBundle 早就跑完了
//（2026-08-30 實測：改 bundle 沒有作用，產出還是 player.html）。
//
// 順手清掉 .DS_Store——Vite 會把 public/ 整個複製過來，而這份資料夾是要交到
// 使用者手上、再由他們上傳的，不該夾帶 macOS 的雜物。
const tidyPlayerDist = (outDir) => ({
  name: 'misheng-player-tidy',
  closeBundle() {
    const from = resolve(outDir, 'player.html');
    if (existsSync(from)) renameSync(from, resolve(outDir, 'index.html'));
    const junk = resolve(outDir, '.DS_Store');
    if (existsSync(junk)) rmSync(junk);
  },
});

export default defineConfig({
  plugins: [react(), firstPaintGround(), tidyPlayerDist(OUT_DIR)],
  base: './',
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    rollupOptions: {
      input: { player: resolve(root, 'player.html') },
    },
  },
});
