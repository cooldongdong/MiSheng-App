// runtimeGame.js
import { REQUIRED_TABLES } from '../../shared/validator/validateGame';

// ── 執行時才讀資料的那條路（獨立播放器）────────────────────────────────
//
// 上面那套是 build-time 的：`import.meta.glob` 由 Vite 在打包時掃資料夾，把檔案清單
// 寫死進 JS。那對 /demo 是對的（遊戲跟著 repo 一起 build），但它讓播放器沒辦法單獨
// 交出去——**使用者換一個遊戲就得重跑一次 build，也就是得先裝 node**。
//
// 這裡的版本反過來：打包時完全不知道會有什麼遊戲，開機之後才去隔壁資料夾拿。
// 於是 build 好的播放器變成一台機器，遊戲是可以換的片子：
//
//   我的遊戲/
//     index.html      ← 播放器（不用改）
//     assets/
//     game/
//       rundown.csv   ← 內容
//       …其餘 6 張表
//       img/
//
// 這條路不是新發明——/create 貼試算表連結時走的就是 runtime 讀資料
//（sheetLoader ＋ imgMap），這裡只是把來源從「Google 試算表」換成「同目錄的資料夾」。

export const RUNTIME_GAME_DIR = 'game';

// 用 document.baseURI 而不是寫死的 './'：使用者很可能丟在
// user.github.io/**某個 repo 名**/ 底下，絕對路徑會全部 404。
// 這樣不管部署在網站根目錄還是子目錄都對。
const runtimeUrl = (relPath, dir = RUNTIME_GAME_DIR) =>
  new URL(`${dir}/${relPath}`, document.baseURI).href;

export const runtimeImgBase = (dir = RUNTIME_GAME_DIR) => runtimeUrl('img/', dir);

/**
 * 讀同目錄 `game/` 底下的 7 張 CSV，回傳跟 loadGameData 完全相同的形狀。
 * 缺表就丟錯——這種錯要當場講清楚，不能讓玩家對著一個永遠轉不完的圈。
 */
export const loadRuntimeGameData = async (dir = RUNTIME_GAME_DIR) => {
  const results = await Promise.all(
    REQUIRED_TABLES.map(async (table) => {
      const url = runtimeUrl(`${table}.csv`, dir);
      let res;
      try {
        res = await fetch(url);
      } catch {
        // 連不到：多半是用 file:// 直接開檔案（fetch 會被 CORS 擋）
        throw new Error(
          `讀不到 ${dir}/${table}.csv。如果你是直接用瀏覽器開檔案（網址是 file://），` +
            `瀏覽器不允許這樣讀資料——要把整個資料夾放上一個網站空間才行。`
        );
      }
      if (!res.ok) {
        throw new Error(`找不到 ${dir}/${table}.csv（伺服器回 ${res.status}）。7 張表都要在。`);
      }
      return [`${table}CsvFile`, await res.text()];
    })
  );
  return Object.fromEntries(results);
};
