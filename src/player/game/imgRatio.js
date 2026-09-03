// imgRatio.js
// 記住每張圖的長寬比，讓骨架佔位第二次之後就完全不跳。
//
// **為什麼需要它：** 圖片的長寬比要載完才知道，所以第一次顯示時骨架該保留多少高度
// 只能用猜的。但玩家在一場遊戲裡會**反覆進出道具頁、反覆放大同一張圖**，
// 所以只要記住第一次量到的比例，之後每一次都是準的。
//
// 這是 2026-09-03 Dong 選的 C 方案：第一次用預設比例（會小跳一下，但比現在
// 「卡片整個塌著、載完瞬間撐開」好很多），之後用記住的（完全不跳）。
//
// **只記得住的 key。** `getImg()` 對本機資料夾回的是 `blob:` 網址，每次開都不一樣，
// 記了只會把空間塞滿而且永遠不會命中——而那條路本來就是本機檔案、瞬間就載完，
// 根本不需要骨架。所以只記 http(s)。

const KEY = 'misheng_img_ratio';
const LIMIT = 60;

// 第一次顯示時的猜測。只影響「這台裝置上從沒看過的圖」的第一眼，
// 載完就會換成真的比例。
export const DEFAULT_RATIO = 4 / 3;

// blob:／data: 每次都不同，不值得記
const cacheable = (src) => typeof src === 'string' && /^https?:\/\//i.test(src);

// localStorage 在無痕模式／關掉 cookie 時會直接 throw，不能讓它弄掛遊戲畫面
const safeRead = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((it) => it && it.k && it.r > 0)
      : [];
  } catch {
    return [];
  }
};

const safeWrite = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 存不進去就算了，這是消除跳動用的，不是資料——大不了每次都用預設比例
  }
};

/** 這張圖上次量到的長寬比；沒量過就回 null（呼叫端用 DEFAULT_RATIO） */
export const readRatio = (src) => {
  if (!cacheable(src)) return null;
  return safeRead().find((it) => it.k === src)?.r ?? null;
};

/** 圖片 onLoad 時把真正的比例記起來。同一張會被移到最前面而不是重複一筆。 */
export const rememberRatio = (src, ratio) => {
  if (!cacheable(src) || !(ratio > 0) || !Number.isFinite(ratio)) return;
  const list = safeRead().filter((it) => it.k !== src);
  list.unshift({ k: src, r: Math.round(ratio * 1000) / 1000 });
  safeWrite(list.slice(0, LIMIT));
};
