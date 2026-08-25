// recentSheets.js
// /create 的「最近用過的試算表」清單。純粹是省下每次都要去翻連結的功夫。
//
// 只記試算表，不記本機資料夾——瀏覽器基於安全不讓程式重新開啟一個資料夾，
// 沒有使用者當場再選一次就拿不到檔案，記了也點不動。
//
// 存的是「遊戲名稱」而不是試算表檔名：gviz 那個端點只吐 CSV、不含文件標題，
// 要拿檔名得走 Drive API ＋ API key，而「不用 API key」正是這條路線的前提。
// config.title 本來就解析過、validator 還規定它不可空白，拿來辨識比檔名更貼切。
//
// 注意這跟 /create「重整就消失、不留存檔」的定位不衝突：那句話講的是**玩家進度**
// （previewMode 不寫 localStorage），這裡存的是工具自己的使用紀錄，而且可以逐筆刪掉。

const KEY = 'misheng_create_recent_sheets';
const LIMIT = 8;

// localStorage 在無痕模式／關掉 cookie 時會直接 throw，不能讓它弄掛開始畫面
const safeRead = () => {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((it) => it && it.id) : [];
  } catch {
    return [];
  }
};

const safeWrite = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 存不進去就算了，這是便利功能不是資料
  }
};

export const readRecentSheets = () => safeRead();

/** 成功載入一份試算表後呼叫。同一份會被移到最前面而不是重複一筆。 */
export const rememberSheet = (id, title) => {
  if (!id) return safeRead();
  const list = safeRead().filter((it) => it.id !== id);
  list.unshift({ id, title: title || '未命名遊戲', at: Date.now() });
  const next = list.slice(0, LIMIT);
  safeWrite(next);
  return next;
};

export const forgetSheet = (id) => {
  const next = safeRead().filter((it) => it.id !== id);
  safeWrite(next);
  return next;
};

/** 相對時間：清單上「多久以前用過」比絕對時間好認 */
export const timeAgo = (at) => {
  if (!at) return '';
  const diff = Date.now() - at;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '昨天';
  if (day < 7) return `${day} 天前`;
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
