// telemetry.js
// 玩家在這一局做了什麼。**這個檔只管「留下來」，不管「送出去」。**
// 出口（Worker 中繼、落到創作者自己的試算表）是另一件事，站在這塊地基上面。
//
// ── 三個設計決定 ──────────────────────────────────────────────
//
// **1. 存事件，不存結論。** 不要存「第三關花了 12 分鐘」——「停留多久」的定義會變
// （要不要扣掉看提示的時間？中途鎖螢幕算不算？），而事件不會。同一批事件之後想換
// 算法就換，資料不必重收。
//
// **2. 一次遊玩一組匿名 sid。** 不登入、不做裝置指紋——要看的是「這一關的分布」，
// 不是「這個人是誰」。sid 跟存檔同生共死：清除進度就換一組新的。
//
// **3. 每則事件自己帶 id。** 之後補送時多半拿不到送達確認（跨網域送出常常是
// opaque 的），所以寧可重送、事後在試算表去重——**重複比遺失好救。**
//
// ── 一條紅線 ──────────────────────────────────────────────────
// **遙測是這整包裡最不重要的功能，不可以拖垮遊戲。** localStorage 在無痕視窗、
// 配額滿、或使用者關掉網站資料時會直接 throw，所以這裡每一支對外的函式都自己
// 吞掉例外——記不到就記不到，畫面不能因此壞掉。

const EVENTS = 'events';
const SID = 'sid';

// 事件數上限。正常一場大概 50～100 則，2000 是「有東西在迴圈」的量級。
// 滿了之後**丟新的、留舊的**：分析要看的是「第一次卡在哪」，前段比後段值錢。
const MAX_EVENTS = 2000;

const storageKey = (gameId, name) => `${gameId}_${name}`;

const newId = () => {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    // 有 crypto 但沒有 randomUUID 的環境（舊 Safari、非安全來源）走下面那條
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

/** 這一局的匿名代號。沒有就生一組記下來；記不住的環境回 null（整條路放棄）。 */
export const sessionIdOf = (gameId) => {
  if (!gameId) return null;
  const key = storageKey(gameId, SID);
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const sid = newId();
    localStorage.setItem(key, sid);
    return sid;
  } catch {
    return null;
  }
};

export const readEvents = (gameId) =>
  gameId ? readJSON(storageKey(gameId, EVENTS), []) : [];

/**
 * 記一則事件。回傳「現在總共有幾則」，方便呼叫端顯示；記不成就回原本的數量。
 *
 * missionId 與 value 一律轉成字串——CSV 出身的資料本來就都是字串，
 * 混型別只會讓之後比對時多一種「看起來一樣卻不相等」的坑。
 */
export const recordEvent = (gameId, type, { missionId = '', value = '' } = {}) => {
  if (!gameId || !type) return 0;
  const sid = sessionIdOf(gameId);
  if (!sid) return 0;

  const events = readEvents(gameId);
  // 已經放過滿溢標記了，之後一律不收
  if (events.length > MAX_EVENTS) return events.length;

  const isOverflow = events.length === MAX_EVENTS;
  events.push({
    id: newId(),
    sid,
    ts: Date.now(),
    type: isOverflow ? 'overflow' : type,
    missionId: isOverflow ? '' : String(missionId ?? ''),
    value: isOverflow ? '' : String(value ?? ''),
  });

  try {
    localStorage.setItem(storageKey(gameId, EVENTS), JSON.stringify(events));
  } catch {
    // 配額滿：這一則就丟了。不重試、不清舊資料——為了記錄而刪掉玩家的存檔是本末倒置
    return events.length - 1;
  }
  return events.length;
};

/** 清除進度時一併清掉。sid 也要換，否則新的一局會被算成舊的那一場。 */
export const clearEvents = (gameId) => {
  if (!gameId) return;
  try {
    localStorage.removeItem(storageKey(gameId, EVENTS));
    localStorage.removeItem(storageKey(gameId, SID));
  } catch {
    // 清不掉就算了
  }
};

// 信封裡放 gameId 與 sid，事件本身就不必每一則重複一次。
export const buildExport = (gameId) => ({
  version: 1,
  gameId,
  sid: sessionIdOf(gameId),
  exportedAt: new Date().toISOString(),
  events: readEvents(gameId),
});

const dateStamp = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;

// 一場一個檔。帶日期與 sid 前六碼，收到一疊檔案時才分得出誰是誰
export const exportFileName = (gameId, sid) =>
  `${gameId}-${dateStamp()}-${(sid || '').slice(0, 6) || 'nosid'}.json`;

export const downloadEvents = (gameId) => {
  const payload = buildExport(gameId);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(gameId, payload.sid);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立刻 revoke 在部分瀏覽器會讓下載拿到空檔——等一拍再收
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
