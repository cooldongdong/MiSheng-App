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

// 匯出的內容與檔名——三條出口（分享／複製／下載）共用同一份，
// 免得哪一條哪天長出自己的格式。
export const exportPayloadText = (gameId) =>
  JSON.stringify(buildExport(gameId), null, 2);

// ---- 三條出口 ----
//
// **為什麼需要三條。** 原本只有「下載」，而它在 app 內建的瀏覽器裡是死的：
// Dong 2026-09-06 實測 iOS 的 Google app 按了完全沒反應，Safari 與 Android Chrome
// 都正常。那類瀏覽器（WKWebView）對 `blob:` ＋ `<a download>` 沒有下載能力，
// 而且**不報錯**。
//
// 危險的是失敗的那一格正是活動當天最可能發生的那一格——玩家多半從 LINE 或
// QR 進來，iOS 上那就是內建瀏覽器，不是 Safari。而這份紀錄只存在玩家自己的
// localStorage 裡，拿不出來就是一筆都沒有。
//
// 所以三條由好到保底排：
//   1. 分享（navigator.share）——手機原生的分享單，接上玩家本來就認得的動作
//   2. 複製——一定會動，任何瀏覽器、任何裝置
//   3. 下載——桌機的正解
//
// 注意 1 與 clipboard API 都**需要 secure context**（https 或 localhost）。
// 區網測試是 http://192.168.x.x，所以那邊只有第 3 條與複製的舊寫法會動。

// 這台裝置能不能用「分享檔案」。分開判斷是因為 navigator.share 存在不代表
// 它吃得下檔案（部分瀏覽器只支援 text/url）。
//
// **這台裝置的分享壞掉了。** 不綁 gameId——那是裝置的能力，不是某一場遊戲的狀態。
//
// 為什麼要記：`navigator.canShare()` 會說謊。Android Chrome 上它回 true，
// 真的送出時卻丟 NotAllowedError（Dong 2026-09-06 實測，而且是真手勢）。
// 探測既然不可信，就改用**事實**——失敗過一次，這台裝置以後就不再提供這個選項。
//
// 「做一個使用者按了會失敗的按鈕」比「少一個按鈕」糟：後者他還有另外兩條路，
// 前者他會以為東西壞了，然後放棄。
const SHARE_BROKEN = 'misheng_share_broken';

const readShareBroken = () => {
  try {
    return localStorage.getItem(SHARE_BROKEN) === '1';
  } catch {
    return false;
  }
};

export const markShareBroken = () => {
  try {
    localStorage.setItem(SHARE_BROKEN, '1');
  } catch {
    // 存不進去就算了，最多下次再失敗一次
  }
};

export const canShareExport = () => {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  if (!navigator.canShare || typeof File === 'undefined') return false;
  if (readShareBroken()) return false;
  try {
    const probe = new File(['{}'], 'probe.json', { type: 'application/json' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

// 叫出系統的分享單，把紀錄當**檔案**送出去（不是一長串文字）——這樣它可以
// AirDrop 給自己的電腦、存進檔案 App、或在聊天軟體裡當附件。
// 回傳有沒有真的送出；使用者按取消也算 false，呼叫端不必把取消當錯誤。
//
// **不再由程式替他重試或改寫型別。** 我猜過兩次都錯：先猜是 iOS 的問題（其實是
// app 內建瀏覽器），再猜是 Chrome 對檔案型別有白名單、改送 text/plain 就會通
// （實測還是失敗）。第二次的重試本來也不可能成功——`navigator.share` 需要
// **使用者手勢的有效期**，而第一次失敗之後已經是另一個 task 了。
//
// 所以現在做的是**把真正的錯誤講出來**，而不是再猜一次：
//
//   - `AbortError` ＝ 使用者自己取消。這**不是失敗**，什麼都不要說——
//     跟他講「你的裝置擋掉了」是在說謊。
//   - 其他 ＝ 真的不行。把錯誤名稱寫在畫面上，下一次就不必再猜。
//
// 實測紀錄（Dong 2026-09-06，部署在 Cloudflare 上）：
//
// | 環境 | 分享 | 下載 |
// | iOS | ✅ | ✅ |
// | iOS app 內建瀏覽器 | ？ | ❌ 按了完全沒反應 |
// | Android Chrome | ❌ canShare() 說可以，送出失敗（原因待測） | ✅ |
// | Firefox（Android）| ❌ 沒有這個 API | ✅ |
//
// 回傳 { ok, reason }：reason 是 null 代表沒話要說（成功、或使用者取消）。
export const shareEvents = async (gameId) => {
  if (!canShareExport()) return { ok: false, reason: '這台裝置沒有分享功能' };
  const payload = buildExport(gameId);
  const name = exportFileName(gameId, payload.sid);
  const file = new File([JSON.stringify(payload, null, 2)], name, {
    type: 'application/json',
  });
  try {
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return { ok: false, reason: '這台裝置不收這種檔案' };
    }
    await navigator.share({ files: [file], title: name });
    return { ok: true, reason: null };
  } catch (err) {
    // 使用者按取消——不是錯誤，不要對他報錯
    if (err?.name === 'AbortError') return { ok: false, reason: null };
    // **name 不夠用**：Chromium 對「沒有手勢」「權限被政策擋掉」「檔案不合法」
    // 都丟 NotAllowedError，只有 message 分得出來是哪一種。
    const detail = String(err?.message || '').slice(0, 80);
    return {
      ok: false,
      reason: [err?.name || '不明原因', detail].filter(Boolean).join(': '),
    };
  }
};

// 複製到剪貼簿。**兩條路都要留**：
// navigator.clipboard 需要 secure context，而測試用的區網網址是 http，
// 部分內建瀏覽器也沒有。舊的 execCommand 雖然標為過時，但正是那些環境唯一會動的。
export const copyEvents = async (gameId) => {
  const text = exportPayloadText(gameId);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 落到底下的舊寫法
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // 不能用 display:none／hidden——選不到的東西複製不了。移到畫面外即可。
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS 只認這個
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
};

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
