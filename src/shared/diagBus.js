// 現場診斷的匯流排：各處把自己的讀數丟進來，由一個面板統一顯示。
//
// **為什麼需要它。** 2026-09-13 那一輪我先後加了 `?diag=camera`（相機）與
// `?diag=width`（版面），而 `?diag=1` 早就有主人（DiagOverlay、shareDiag）。
// 結果是三個參數要記，而且值填錯就什麼都看不到；更糟的是我一開始讓新的面板也吃
// `diag=1`，於是三塊浮層同時冒出來互相遮擋（Dong：「太多檢測視窗，都彼此遮擋」
// 「相機的監測還是被自測鈕那些擋住了」）。
//
// ⇒ **一個開關（`?diag=1`），面板內用分頁切換。** 要量什麼是面板的事，不是網址的事。
//
// **為什麼放 shared。** 註冊的人散在兩層：相機在 player、版面量測在 studio。
// 這裡只有資料與訂閱，沒有任何 UI，所以兩邊都依賴得起（四層規則：都能往 shared 依賴）。

const tabs = new Map();
const listeners = new Set();

// **快照要是穩定的參考。** `useSyncExternalStore` 每次繪製都會呼叫 getSnapshot，
// 並用 `Object.is` 比對——每次回傳一個新陣列的話，它會認定狀態一直在變，
// 於是無限重繪，整棵樹當場掛掉（2026-09-13 我就是這樣讓 /create 與 /demo
// 全部變成白畫面的，而且**跟有沒有帶 ?diag=1 無關**，因為 hook 不能條件呼叫）。
// 所以排序後的陣列存起來，只有真的變動時才重建。
let snapshot = [];

const rebuild = () => {
  snapshot = [...tabs.values()].sort((a, b) => a.order - b.order);
};

const emit = () => {
  rebuild();
  for (const fn of listeners) fn();
};

// 網址帶 ?diag=1 才做事。**只認這一個值**——多一個值就多一次「填錯就看不到」。
export const diagEnabled = () => {
  try {
    return new URLSearchParams(window.location.search).get('diag') === '1';
  } catch {
    return false;
  }
};

/**
 * 新增或更新一個分頁。
 *
 * @param {string} key   識別字，重複呼叫同一個 key 就是更新
 * @param {object} data  { title, order?, text?, node? }
 *                       text＝等寬純文字（多數讀數）；node＝自己畫的 React 內容
 *                       （既有的 DiagOverlay 有互動按鈕，裝不進 text）
 */
export const setDiagTab = (key, data) => {
  const prev = tabs.get(key) || {};
  const next = { order: 50, ...prev, ...data, key };
  // 內容沒變就不要驚動訂閱者——版面量測 300ms 跑一次，
  // 每次都 emit 會讓整個面板跟著重畫，連帶讓使用者選不起文字。
  if (prev.text === next.text && prev.title === next.title && prev.node === next.node) {
    return;
  }
  tabs.set(key, next);
  emit();
};

export const removeDiagTab = (key) => {
  if (tabs.delete(key)) emit();
};

// 依 order 排序，讓分頁的順序穩定——每次重畫都換位置的話沒有人點得準。
// 回傳的是快取的那一份（見上面 snapshot 的說明），不可以在這裡重新建立陣列。
export const getDiagTabs = () => snapshot;

export const subscribeDiag = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
