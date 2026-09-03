// gidCache.js
// 記住每一份試算表的「分頁名 → gid」對照，省下 sheetLoader 開頭那趟 htmlview。
//
// **為什麼值得快取：** COO-168 改走 export?gid= 之後，載入多了一趟序列往返
// （htmlview 約 0.7s，整體 1.0s → 1.7s）。而那趟的答案幾乎不會變——gid 是分頁
// 建立時發的號碼，改名、搬位置、改內容都不會動到它。
//
// **為什麼是 localStorage 而不是記憶體：** Dong 重讀試算表的方式是 Cmd+R 重整整個
// 頁面（/create 會照網址 hash 自動重讀，見 CreateApp 的 hashIntent.autoload），
// 記憶體快取每次都跟著頁面一起死。而 htmlview 回的是
// `cache-control: no-cache, no-store, must-revalidate`，瀏覽器自己的快取也不會幫忙
// ——每一次重整都全額付一次那 0.7s。
//
// **會過期的情況只有一種：分頁被刪掉重建**（同名、新 gid）。所以呼叫端必須有修復
// 路徑（見 sheetLoader 的 loadGameFromSheet）：拿舊 gid 去打 export 會回 4xx，
// 那時丟掉這份快取、重抓一次、整組重試。
//
// 沒有修復路徑的話，使用者看到的會是「讀取「hint」分頁失敗（HTTP 400）」——
// 一個完全不提「你剛剛重建過分頁」的錯誤訊息，正是 COO-168 查了三天的同一種病。

const KEY = 'misheng_create_sheet_gids';
const LIMIT = 8;

// localStorage 在無痕模式／關掉 cookie 時會直接 throw，不能讓它弄掛開始畫面
const safeRead = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((it) => it && it.id && it.gids) : [];
  } catch {
    return [];
  }
};

const safeWrite = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 存不進去就算了，這是加速不是資料——大不了回到每次都抓 htmlview
  }
};

/** 拿這份試算表的分頁對照；沒有就回 null（呼叫端去抓 htmlview） */
export const readGids = (id) => {
  if (!id) return null;
  const hit = safeRead().find((it) => it.id === id);
  return hit ? hit.gids : null;
};

/** 抓到（或重抓到）對照之後記起來。同一份會被移到最前面而不是重複一筆。 */
export const rememberGids = (id, gids) => {
  if (!id || !gids || !Object.keys(gids).length) return;
  const list = safeRead().filter((it) => it.id !== id);
  list.unshift({ id, gids, at: Date.now() });
  safeWrite(list.slice(0, LIMIT));
};

/** 確認這份對照是錯的（export 回 4xx）時丟掉，下一次會重抓 */
export const forgetGids = (id) => {
  if (!id) return;
  safeWrite(safeRead().filter((it) => it.id !== id));
};
