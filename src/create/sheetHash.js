// sheetHash.js
// 把「現在在看哪一份試算表」放進網址的 # 後面，讓這一頁可以被複製、被分享。
//
// 為什麼是 hash 而不是路徑或 query：
//   ① # 之後的東西瀏覽器不會放進 HTTP 請求，所以伺服器永遠只看到 /create——
//      不必加任何 Vercel rewrite，也就不必動這個專案被自己的假設咬過兩次的部署設定。
//   ② 同理，試算表位址不會進伺服器的 access log，也不會出現在 referrer。
//   ③ 它天然「不像正式網址」，而 /create 要不要升格成正式的分享管道還沒決定——
//      hash 保留了退路，路徑一旦上線就等於宣告了。
// excalidraw 的 #json=、mermaid live 的 #pako:、TS playground 的 #code= 都是同一招。
//
// URLSearchParams 只認格式不認位置：# 後面那串的格式跟查詢字串一樣（key=value），
// 所以直接餵給它就好。slice(1) 是因為 location.hash 含開頭的 # 而它不吃這個字元。

const KEY = 'sheet';

export const readSheetFromHash = () => {
  try {
    return new URLSearchParams(window.location.hash.slice(1)).get(KEY) || '';
  } catch {
    return '';
  }
};

// 寫入的一律是乾淨的 spreadsheet id，所以分享出去的永遠是短的那種形式，
// 即使使用者當初是貼一整條 Google 網址進來。
//
// 用 replaceState 而不是直接指派 location.hash：後者會多一筆瀏覽歷史
// （按上一頁會在同一頁裡跳來跳去），而且會觸發 hashchange。
export const writeSheetToHash = (id) => {
  if (!id) return;
  try {
    const params = new URLSearchParams();
    params.set(KEY, id); // set() 會自動編碼，值裡有 & 或 = 也不會把網址腰斬
    window.history.replaceState(null, '', `#${params.toString()}`);
  } catch {
    // 網址列沒更新不影響功能，不值得讓它中斷流程
  }
};

// 換一份＝重來，網址列不該還指著上一份——否則複製出去的連結會說謊
export const clearSheetHash = () => {
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch {
    // 同上
  }
};
