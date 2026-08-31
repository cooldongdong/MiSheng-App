import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'node:path'
import { existsSync, renameSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs'
import { zipSync } from 'fflate'
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
    // publicDir:false 之後這兩樣本來就不會進來了，但清理留著當保險——
    // 它們曾經真的跑進去過：.DS_Store 是 macOS 的雜物，player.zip 則是
    // 上一次 build 的產物被這一次包進自己裡面（505 kB → 1011 kB，每次翻倍）。
    for (const name of ['.DS_Store', 'player.zip']) {
      const stale = resolve(outDir, name);
      if (existsSync(stale)) rmSync(stale);
    }
    writePlayerZip(outDir);
  },
});

// 把整份播放器壓成 public/player.zip，讓 /create 在瀏覽器裡拿得到它。
//
// 為什麼要有這一步：使用者按「匯出」時，我們要給的是**一包解壓就能上架的東西**
// ——播放器 ＋ 他自己的遊戲。播放器的檔案在伺服器上，遊戲在他的瀏覽器裡，
// 所以合併只能在瀏覽器端做：抓這個 zip、解開、跟遊戲資料拌在一起、再壓回去。
//
// 為什麼是 zip 而不是列一張檔案清單去逐一抓：檔名帶雜湊，每次 build 都不一樣，
// 清單要嘛得跟著產、要嘛會過期。一個 zip 就沒有這個問題。
//
// 放 public/ 是因為 Vite 會把它原封不動複製進 dist/，於是 misheng.app 上就有
// /player.zip 這個網址。它是 build 產物，不進 git。
const zipDir = (dir, base = '') => {
  const out = {};
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    // game/ 是本機測試時自己放進去的遊戲資料，不是播放器的一部分
    if (!base && name === 'game') continue;
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) Object.assign(out, zipDir(full, `${base}${name}/`));
    // level 0：js/css 待會還會跟遊戲一起被壓一次，這裡壓了只是白做工
    else out[`${base}${name}`] = [new Uint8Array(readFileSync(full)), { level: 0 }];
  }
  return out;
};

const writePlayerZip = (outDir) => {
  const files = zipDir(outDir);
  const publicDir = resolve(root, 'public');
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  const target = resolve(publicDir, 'player.zip');
  writeFileSync(target, zipSync(files));
  const kb = Math.round(statSync(target).size / 1024);
  console.log(`\n  public/player.zip  ${Object.keys(files).length} 個檔案  ${kb} kB`);
};

export default defineConfig({
  plugins: [react(), firstPaintGround(), tidyPlayerDist(OUT_DIR)],
  base: './',
  // 不複製 public/。
  //
  // Vite 預設會把 public/ 整個資料夾原封不動搬進輸出，而這一份輸出是要交到使用者
  // 手上的——**進去的東西不該由「誰往 public/ 丟了什麼」決定**。實際發生過的兩件：
  // 謎生的 logo（他的遊戲分頁上不該有我們的品牌）與一個 macOS 的 .DS_Store。
  //
  // 這與 buildTimeGame.js 分家是同一種病的兩個位置：一個是 import 把資產拖進 bundle，
  // 一個是設定把資產拖進資料夾。兩邊都要明確地說「只放需要的」。
  publicDir: false,
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    rollupOptions: {
      input: { player: resolve(root, 'player.html') },
    },
  },
});
