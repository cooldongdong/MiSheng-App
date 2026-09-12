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
// 送出去到第幾則了（水位）。事件陣列只增不減，所以「數到第幾則」就足以表達進度。
const SENT = 'sent';

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
    // 水位要一起清。留著的話下一局的前幾則會被當成「已經送過」而永遠不送
    localStorage.removeItem(storageKey(gameId, SENT));
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

// ---- 送出層：把還沒送出去的事件交給創作者的 Apps Script ----
//
// **設計的重點是「不要掉」，不是「即時」。** 這是戶外實境遊戲——玩家會走進地下室、
// 鎖螢幕、講電話、把分頁切掉。每則事件即時送的話，訊號差的那幾分鐘就是永久的洞。
//
// 所以：事件照舊先寫進 localStorage（那一層不變），另外記一個**水位**（送到第幾則）。
// 定期把水位之後的整批送出去，送成功才推進水位。離線、關掉分頁、中途沒訊號都不掉
// ——下次打開會把積欠的補送。
//
// 去重靠事件自己帶的 id，由 Apps Script 那端負責（見創作者文件裡的腳本）。
// 所以「重複送」是安全的，而「沒送到卻推進水位」不是——**判斷失敗時一律不推進**。
//
// **拿不到送達確認。** 跨來源的回應是不透明的，程式讀不到成功與否。這裡的「成功」
// 只代表「瀏覽器收下了這個請求」，不代表對方寫進試算表了。真正的確認只有一種：
// 人去看那張表（見 /create 的「測試連線」）。

// 一次最多送幾則。Apps Script 對單次請求的大小與執行時間都有限制，而補送時
// 可能一口氣累積了幾百則——切開來送，下一次 tick 再送剩下的。
const FLUSH_BATCH = 200;

// 多久送一次。**不需要即時**——這份資料是活動結束後拿來分析的，不是即時儀表板。
// 拉長一點的好處是省電、省流量，而且同一批多送幾則、少發幾次請求。
// 真正保證不掉的是分頁關掉時那一次 sendBeacon，不是這個間隔。
//
// **30 秒改成 60 秒**（2026-09-09 壓測後）。落地端是 Apps Script，它一次只放一個
// 請求進去寫，量到的是每個請求佔住那道門約 0.78 秒——換算下來 30 秒的窗口只放得過
// 38 個，而 50 支手機每 30 秒各送一次就是需求 50。**這個常數是需求那一側的分母**，
// 加倍等於把需求砍半，是三個修正裡最便宜的一個。
//
// 代價：手機突然斷電最多掉 60 秒的事件。正常離開（切走、關分頁）走 pagehide 的
// sendBeacon，不受這個間隔影響。
export const FLUSH_MS = 60000;

const readSent = (gameId) => {
  const n = Number(readJSON(storageKey(gameId, SENT), 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// 有幾則還沒送出去。給「要不要提醒創作者」之類的判斷用。
export const pendingCount = (gameId) =>
  gameId ? Math.max(0, readEvents(gameId).length - readSent(gameId)) : 0;

// 同時只允許一次 flush。定時器與 visibilitychange 可能同時觸發，兩邊各自讀到
// 同一個水位、各送一批、各推進一次——**重複送是安全的（對方會去重），
// 但重複推進水位會跳過中間那一批，那是真的掉資料。**
let flushing = false;

/**
 * 把還沒送出去的事件送給 url。
 *
 * @param beacon 用 navigator.sendBeacon 而不是 fetch。**分頁被關掉時只剩它**
 *               ——那一刻 fetch 會被中止，beacon 會被瀏覽器接手送完。
 *               （beacon 是同步交出去的，所以這個函式雖然是 async，
 *               在第一個 await 之前就已經把資料交給瀏覽器了。）
 * @returns 這一次送出了幾則（0 代表沒東西可送，或送不出去）
 */
export const flushEvents = async (gameId, url, { beacon = false } = {}) => {
  if (!gameId || !url || flushing) return 0;
  flushing = true;
  try {
    const events = readEvents(gameId);
    const sent = readSent(gameId);
    const batch = events.slice(sent, sent + FLUSH_BATCH);
    if (batch.length === 0) return 0;

    const body = JSON.stringify({
      gameId,
      sid: sessionIdOf(gameId),
      events: batch,
    });

    // text/plain 是 CORS 安全清單內的型別，所以不會觸發 preflight——
    // Apps Script 不處理 OPTIONS，用別的型別會直接被瀏覽器擋在門外
    if (beacon) {
      const queued = navigator.sendBeacon(
        url,
        new Blob([body], { type: 'text/plain' })
      );
      // 佇列不下（超過瀏覽器的 beacon 大小上限）就不推進，留給下次
      if (!queued) return 0;
    } else {
      try {
        // **cors 而不是 no-cors（2026-09-09 實測推翻 9-07 的結論）。**
        //
        // 原本用 no-cors，理由是「Apps Script 會轉址、讀不到回應」。**寫得進去
        // 是真的，讀不到是沒驗過就假設的**——而它的代價很大：no-cors 的回應永遠是
        // opaque，`ok` 恆為 false、status 恆為 0，於是**送成功與對方回錯誤長得
        // 一模一樣**。水位照樣推進，那批資料就安靜地消失了，包括「超過每日額度」
        // 這種最該被發現的情況。
        //
        // 實測（從 localhost 跨網域打 Apps Script，跟真實情況同一種）：
        //   正常          → ok:true、type:'cors'、讀得到 'ok 0'
        //   腳本自己爆    → fetch 直接丟例外（錯誤頁沒帶 CORS 標頭）
        //   網址是錯的    → 同上
        // 三種都分得出來，而且失敗全部走 catch——也就是下面那條「不推進水位」。
        //
        // 為什麼不會觸發 preflight：text/plain 在 CORS 安全清單裡，
        // 瀏覽器不會先發 OPTIONS（Apps Script 不處理 OPTIONS，發了就會被擋在門外）。
        //
        // **一定要 await**：網路層失敗時要能不推進水位，同步推進的話
        // .catch 已經來不及，那一批就永遠不會再送了
        const res = await fetch(url, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain' },
          body,
        });
        // 有回應也要看內容。萬一哪天 Google 回一個「帶著 CORS 標頭的錯誤頁」，
        // 光看 res.ok 會被騙過去——而 doPost 成功時一定是 'ok N'。
        const text = await res.text();
        if (!res.ok || text.indexOf('ok') !== 0) return 0;
      } catch {
        // 離線、對方掛了、腳本爆了——水位不推進，下次再送。
        //
        // 這條路現在可能製造重複（寫進去了、但回應讀不到就重送一次）。
        // **那是刻意選的方向**：重複由報表端的 seenId 收掉，而漏掉沒有人收得掉。
        return 0;
      }
    }

    localStorage.setItem(storageKey(gameId, SENT), String(sent + batch.length));
    return batch.length;
  } catch {
    // 遙測壞掉不可以拖垮遊戲
    return 0;
  } finally {
    flushing = false;
  }
};

const dateStamp = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;

// 一場一個檔。帶日期與 sid 前六碼，收到一疊檔案時才分得出誰是誰
// **副檔名是 .txt，不是 .json。** 內容仍然是 JSON，換的只是一件外衣。
//
// 三個理由，由硬到軟：
//   ① **Chromium 對可分享的檔案有副檔名白名單，`.json` 不在裡面**——送 .json 的
//      分享在 Android 上必定失敗（2026-09-06 追了四輪才確認）。分享那條路本來就
//      已經改送 .txt 了，只是它是在自己那一支裡 replace，於是三條出口長出兩種檔名。
//   ② 收檔的人面對的是 50 份檔案，**混著兩種副檔名而內容完全一樣**，沒有好處。
//   ③ `.txt` 在手機上點得開；`.json` 常常沒有預設程式。
export const exportFileName = (gameId, sid) =>
  `${gameId}-${dateStamp()}-${(sid || '').slice(0, 6) || 'nosid'}.txt`;

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
// 換版過一次（v2）：v1 時期的分享送的是 .json，在 Android 上必定失敗，於是那些
// 裝置都被標成「分享壞掉」。修好送法之後那個標記就是錯的——不換 key 的話，
// 修好了但按鈕永遠不會回來。
const SHARE_BROKEN = 'misheng_share_broken_v2';

const readShareBroken = () => {
  try {
    return localStorage.getItem(SHARE_BROKEN) === '1';
  } catch {
    return false;
  }
};

// 這個網頁被允許用哪些功能——由伺服器的 Permissions-Policy 回應標頭決定。
//
// ⚠️ **`allowsFeature()` 對「不認得的功能名稱」也回 false**，而不是丟錯。所以
// 一定要先確認名字在 `features()` 裡，否則會把「這個瀏覽器沒有這個政策項目」
// 誤讀成「被政策擋掉」。
//
// 2026-09-06 我就是這樣誤判的：看到 `allowsFeature('web-share')` 回 false 就
// 斷定是 Cloudflare 加了安全標頭，讓 Dong 去翻部署設定——實際上那台伺服器
// **一個 Permissions-Policy 標頭都沒送**，而 `web-share` 根本不在 Chromium 的
// `features()` 清單裡（清單裡跟 share 有關的只有 shared-storage）。
//
// 順便看 camera：Camera 道具靠它，而「安全標頭」預設常把它一起關掉——那會讓
// 道具直接壞掉，而且沒有人會聯想到是標頭的問題。camera **在**清單裡，所以那一格
// 的答案是可信的。
export const policySnapshot = () => {
  const fp = typeof document !== 'undefined' ? document.featurePolicy : null;
  if (!fp?.allowsFeature || !fp?.features) return '';
  const known = new Set(fp.features());
  const of = (name) => {
    if (!known.has(name)) return '查不到（這個瀏覽器沒有這個政策項目）';
    try {
      return fp.allowsFeature(name) ? '可' : '被擋';
    } catch {
      return '?';
    }
  };
  return `web-share ${of('web-share')}／camera ${of('camera')}`;
};

export const markShareBroken = () => {
  try {
    localStorage.setItem(SHARE_BROKEN, '1');
  } catch {
    // 存不進去就算了，最多下次再失敗一次
  }
};

// **一定要有回頭路。** 上一版失敗一次就永久藏起那顆鈕，唯一的復原方式是清掉整站
// 的瀏覽器資料——連帶把遊戲進度一起清掉。對測試的人是災難，對玩家也不合理：
// 分享失敗可能是當下的狀況（沒選 app、系統忙），不是這台裝置永遠不行。
export const clearShareBroken = () => {
  try {
    localStorage.removeItem(SHARE_BROKEN);
  } catch {
    // 清不掉也沒關係，下一次還是會照現況判斷
  }
};

export const isShareBroken = () => readShareBroken();

export const canShareExport = () => {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  if (!navigator.canShare || typeof File === 'undefined') return false;
  if (readShareBroken()) return false;
  try {
    // **探針要送跟真正送出時一樣的東西。**
    // 原本探的是 `probe.json`／`application/json`，而實際送的是 .txt／text/plain
    // ——**探測與執行讀的不是同一份規則，那個 true 就什麼都不保證**
    //（這個檔下面就記著 canShare 說謊的那次）。Chromium 的副檔名白名單目前只在
    // 真正送出時才檢查，所以今天兩者都回 true；但哪天它提前到 canShare，
    // 用 .json 探就會變成假的否定，按鈕會無故消失。
    const probe = new File(['{}'], 'probe.txt', { type: 'text/plain' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

// 叫出系統的分享單，把紀錄當**檔案**送出去（不是一長串文字）——這樣它可以
// AirDrop 給自己的電腦、存進檔案 App、或在聊天軟體裡當附件。
// 回傳有沒有真的送出；使用者按取消也算 false，呼叫端不必把取消當錯誤。
//
// 失敗時回傳 `{ ok, reason }`，reason 是 null 代表沒話要說（成功、或使用者取消）：
//
//   - `AbortError` ＝ 使用者自己取消。這**不是失敗**，什麼都不要說——
//     跟他講「你的裝置擋掉了」是在說謊。
//   - 其他 ＝ 真的不行。把錯誤名稱與訊息寫在畫面上，下一次就不必猜。
//
// 實測紀錄（Dong 2026-09-06，部署在 Cloudflare 上）：
//
// | 環境 | 分享 | 下載 |
// | iOS | ✅ | ✅ |
// | iOS app 內建瀏覽器 | ？（download 已知失敗，分享待測）| ❌ 按了完全沒反應 |
// | Android Chrome | ✅ 改送 .txt 之後（送 .json 必定失敗）| ✅ |
// | Firefox（Android）| ❌ 沒有這個 API | ✅ |
//
export const shareEvents = async (gameId) => {
  if (!canShareExport()) return { ok: false, reason: '這台裝置沒有分享功能' };
  const payload = buildExport(gameId);
  // **送 .txt／text/plain，不送 .json。**
  //
  // Chromium 對可分享的檔案**副檔名有白名單**，而 `.json` 不在裡面——`canShare()`
  // 回 true，`share()` 才丟 `NotAllowedError: Permission denied`。探測與實際執行
  // 用的是兩套規則，所以「先問再送」在這裡沒有用。
  //
  // 怎麼確定的（2026-09-06，Dong 的 Android Chrome，`?diag=1` 的現場探針）：
  //   · share／canShare 都是 true，canShare(text) 與 canShare(files) 也都是 true
  //   · `web-share` **不在** `features()` 清單裡 ⇒ allowsFeature 的 false 沒有意義，
  //     跟伺服器的 Permissions-Policy 無關（那台伺服器一個相關標頭都沒送）
  //   · **兩個探針都成功彈出分享視窗**，而它們送的是 .txt／text/plain
  //   ⇒ 差別只剩檔案型別。
  //
  // 中間我還錯過一次：曾經「失敗後改送 text/plain 重試」，一樣失敗，於是排除了
  // 型別這個可能。**那次失敗的真正原因是使用者手勢已經過期**——`share()` 必須在
  // 手勢的有效期內呼叫，而第一次失敗之後已經是另一個 task 了。用錯的方法測，
  // 會得到看起來很確定的錯誤結論。
  //
  // 內容仍然是 JSON，只是換一件外衣。iOS 那邊 .json 本來就能送，改成 .txt 也一樣。
  // **檔名現在由 exportFileName 直接給**，不再在這裡 replace——三條出口共用同一個
  // 檔名，這個檔頭那句「免得哪一條哪天長出自己的格式」才是真的
  // 收得到——一種送法涵蓋所有環境，比分平台特例可靠。
  const name = exportFileName(gameId, payload.sid);
  const file = new File([JSON.stringify(payload, null, 2)], name, {
    type: 'text/plain',
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
    // name 不夠用：Chromium 對「沒有手勢」「權限被政策擋掉」「檔案型別不合法」
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
    type: 'text/plain',
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
