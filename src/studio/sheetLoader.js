// sheetLoader.js
// 即時轉化：從一份 Google 試算表的連結，抓出 7 張表的 CSV。
//
// 主要走 export endpoint（不是 gviz）：
//   https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=<分頁gid>
//
// **為什麼不能用 gviz —— 它會吃掉資料。**
//
// gviz 是 Google Visualization API 的查詢端點，設計目的是餵圖表。因為圖表要畫折線，
// 它有一個帶型別的資料模型：每一欄必須是 number/string/date 其中一種。它會先推斷
// 整欄的型別，**再把不符型別的儲存格丟成 null**——對圖表來說那是正確行為，
// 對「讀一個檔案」來說那是資料遺失。
//
// 2026-09-03 實測（Dong 的福德之路試算表）：rundown 的 id 欄大多是 1、2、3，
// 於是被判成 number；他為了讓 Quiz 的 nextId 看得懂而填的語意化 id「水圳路線」
// 「植物路線」**整格變成空的**。validator 因此報「id 不可空白」與「nextId 找不到」
// ——四個錯誤沒有一個提到「中文」，所以查了三天才找到真凶。
//
// 而語意化 id 正是 2026-07-22 PR #4 特地放寬 validator 要支援的用法。
//
// **這個轉換發生在資料離開 Google 之前，我們這邊救不回來。** 實測過所有 gviz 的
// 寫法（out:csv／out:json／format A '@'／select A）都一樣是空的；JSON 輸出裡
// 那一欄的型別字面上就是 "number"，儲存格是 null——連空字串都不是。
//
// export 端點是「檔案 → 下載 → CSV」的網址版，沒有資料模型、不推型別，
// 儲存格顯示什麼就寫什麼。
//
// **代價：它認 gid（每個分頁一組數字），不認分頁名。**
// gid 從 /htmlview 的頁面原始碼裡挖（見 fetchSheetGids）——那是網頁不是 API，
// 沒有任何相容性保證。所以**挖不到就整組退回 gviz**：最壞情況等於這次改動之前，
// 而那個情況今天已經在掉資料了，所以這個交換沒有下檔風險。
//
// 那趟 htmlview 是**序列的**，載入因此從約 1.0 秒變成約 1.7 秒。gid 幾乎不會變
//（改名、搬位置、改內容都不動它），所以存進 localStorage 重複使用，並在貼上網址的
// 當下先抓（見 gidCache 與 prefetchSheetGids）。剩下那 1.0 秒省不掉：export 的 307
// 導去 googleusercontent.com，網址帶會輪替的簽章 token，既算不出來也存不住。
//
// 三個端點都帶 access-control-allow-origin，瀏覽器可以直接 fetch，不用後端代理
//（export 會先回一個 307，兩跳都帶 CORS）。
//
// 註：唯一「用名字定址 ＋ 資料忠實」都有的是 Sheets API v4，但它要 API key 或
// OAuth，而 /create 的賣點是「貼一個連結就能用、不用申請任何東西」。等哪天做
// 託管服務、創作者本來就要登入了，那時 v4 才變成合理選項。
//
// 前提：試算表要「共用給知道連結的任何人」，且 7 個分頁名固定為 REQUIRED_TABLES。

import Papa from 'papaparse';
import { REQUIRED_TABLES } from '../shared/validator/validateGame';
import { withRowKeys } from '../shared/rowKey';
import { readGids, rememberGids, forgetGids } from './gidCache';

// 從各種 Google 試算表網址挖出 spreadsheet id
export const parseSpreadsheetId = (input) => {
  if (!input) return null;
  const url = String(input).trim();

  // 直接貼 id 的情況
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;

  const m = url.match(/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
};

const gvizUrl = (id, sheetName) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName
  )}`;

const exportUrl = (id, gid) =>
  `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid)}`;

const htmlViewUrl = (id) =>
  `https://docs.google.com/spreadsheets/d/${id}/htmlview`;

// 每一支抓取都要有逾時。
//
// 七個分頁是 Promise.all 併發的，只要其中一支永遠不落地，整個 await 就永遠不回來——
// 而「正在讀取試算表」那個畫面**沒有取消鈕、也沒有時間上限**，於是使用者就真的卡在
// 那裡，除了重新整理沒有別條路（Dong 2026-08-28 回報卡住；他那個案例我重現不出來，
// 但「沒有出口」這件事跟是哪個網址無關）。
// 瀏覽器自己的逾時是好幾分鐘，對使用者而言跟當掉沒有差別。
const FETCH_TIMEOUT_MS = 12000;

// 分頁名 → gid。挖的是 /htmlview 的頁面原始碼裡那段分頁列的 JS：
//   items.push({name: "rundown", pageUrl: "…gid=757001573", gid: "757001573", …})
//
// **這是網頁不是 API，隨時可能改。** 所以任何一步出錯都回 null，讓呼叫端整組退回
// gviz——退回去只是回到這次改動之前的行為，不會比現在更糟。
//
// 正則限制在 items.push({…}) 之內、且 name 與 gid 之間不跨 `}`，
// 免得跟頁面上別的 JS 物件配對到一起。
const fetchSheetGids = async (id) => {
  try {
    const res = await fetch(htmlViewUrl(id), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const re = /items\.push\(\{\s*name:\s*"([^"]+)"[^}]*?gid:\s*"(\d+)"/g;
    const map = {};
    let m;
    while ((m = re.exec(html)) !== null) map[m[1]] = m[2];
    return Object.keys(map).length ? map : null;
  } catch {
    return null;
  }
};

const fetchSheetCsv = async (id, sheetName, gid) => {
  // 有 gid 就走 export（資料忠實），沒有就退回 gviz（會推型別，但至少讀得到）
  const url = gid ? exportUrl(id, gid) : gvizUrl(id, sheetName);
  let res;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    // 逾時與斷線在這裡都是 fetch reject，但對使用者是兩件事，要分開講
    if (err?.name === 'TimeoutError') {
      throw new Error(
        `讀取「${sheetName}」分頁超過 ${FETCH_TIMEOUT_MS / 1000} 秒沒有回應，請確認網路後再試一次`
      );
    }
    throw new Error(`連不上 Google 試算表（讀取「${sheetName}」分頁時）`);
  }

  if (!res.ok) {
    // 404＝找不到這個分頁名；其他多半是權限沒開（Google 會導去登入頁）
    const err = new Error(
      res.status === 404
        ? `找不到名為「${sheetName}」的分頁`
        : `讀取「${sheetName}」分頁失敗（HTTP ${res.status}）`
    );
    // 把狀態碼掛上去，讓 loadGameFromSheet 分得出「這是 gid 過期」還是「網路不通」。
    // 逾時與斷線走的是上面那個 catch，不會有這個欄位——它們不該觸發快取修復。
    err.httpStatus = res.status;
    throw err;
  }

  const text = await res.text();

  // 權限沒開時 Google 不會給 4xx，而是回一頁登入 HTML
  if (/^\s*</.test(text)) {
    throw new Error('讀不到試算表內容，請確認已「共用給知道連結的任何人」');
  }

  return text;
};

// 七張表一起抓。抽成函式是因為快取過期時要整組再跑一次
// （只重試失敗的那一支不夠：gid 全部來自同一份過期對照）。
const fetchAllCsv = (id, gids) =>
  Promise.all(
    REQUIRED_TABLES.map((type) => fetchSheetCsv(id, type, gids?.[type]))
  );

/**
 * 貼上網址的當下先去問分頁對照，把 htmlview 那 0.7s 藏在使用者
 * 把手移到「載入」按鈕的時間裡。
 *
 * **這條救得了第一次載入，快取救不了**——第一次快取本來就是空的。
 *
 * 刻意不回傳也不丟錯：抓到就寫進快取，抓不到就當沒發生，
 * 真正載入時 loadGameFromSheet 自己會再問一次。使用者只是在打字，
 * 不該因為背景那支請求失敗就看到紅字。
 */
export const prefetchSheetGids = (input) => {
  const id = parseSpreadsheetId(input);
  if (!id || readGids(id)) return;
  fetchSheetGids(id)
    .then((gids) => {
      if (gids) rememberGids(id, gids);
    })
    .catch(() => {});
};

/**
 * 抓一份試算表，回傳：
 *   csvFiles — 7 個 `${type}CsvFile` 原始 CSV 字串，可直接展開給 <GameController />
 *   tables   — { [type]: { fields, rows } }，直接餵給 validateGame()
 */
export const loadGameFromSheet = async (input) => {
  const id = parseSpreadsheetId(input);
  if (!id) {
    throw new Error('這不像 Google 試算表的連結，請貼上試算表網址');
  }

  // 分頁的 gid：先看快取（上一次載入留下的，或貼上網址時預抓的），
  // 沒有才當場問一次 htmlview。拿不到就整組走 gviz（見 fetchSheetGids 的註解）。
  // 只問一次：七張表共用同一份對照，不必問七遍。
  // **蓋不滿七張表的快取不算命中。** 缺的那一張會退回 gviz，而 gviz 會推型別、
  // 把中文 id 吃成空的（見檔頭）——沒有錯誤、沒有紅字，資料就這樣少了。
  // 創作者後來才補上某張分頁、或改過分頁名時就會撞到。
  const cached = readGids(id);
  let gids =
    cached && REQUIRED_TABLES.every((type) => cached[type]) ? cached : null;
  const usedCache = Boolean(gids);
  if (!gids) {
    gids = await fetchSheetGids(id);
    if (gids) rememberGids(id, gids);
  }

  let csvList;
  try {
    csvList = await fetchAllCsv(id, gids);
  } catch (err) {
    // 快取修復。gid 只在分頁被**刪掉重建**時會變（同名、新號碼），
    // 那時拿舊 gid 去打 export 會回 4xx，而錯誤訊息長成
    //「讀取「hint」分頁失敗（HTTP 400）」——一個字都沒提到真正的原因。
    // 所以這裡自己補救：丟掉這份對照、重抓一次、整組重跑。
    //
    // **兩個條件缺一不可。** 只認帶 httpStatus 的錯誤（逾時與斷線沒有這個欄位，
    // 重試它們只會讓使用者從等 12 秒變成等 24 秒才看到同一句話），
    // 而且只在真的用了快取的時候——剛從 htmlview 抓來的對照再抓一次還是一樣。
    if (!usedCache || !err?.httpStatus) throw err;
    forgetGids(id);
    const fresh = await fetchSheetGids(id);
    if (fresh) rememberGids(id, fresh);
    csvList = await fetchAllCsv(id, fresh);
  }

  const csvFiles = {};
  const tables = {};

  REQUIRED_TABLES.forEach((type, i) => {
    const csv = csvList[i];
    csvFiles[`${type}CsvFile`] = csv;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: false });
    // **每一列都要有內部身分。** /create 有兩條解析路徑：遊戲走 loadCSVData、
    // 流程圖與檢查走這裡。只有前者掛 key 的話，id 可以留空之後，流程圖會把所有
    // 無名列都當成同一個（keyOf 回傳空字串），整張圖塌成幾個框。
    // 「解析過的列一定有 key」必須是兩條路都成立的不變式（見 shared/rowKey）。
    tables[type] = {
      fields: result.meta.fields || [],
      rows: withRowKeys(result.data),
    };
  });

  return { spreadsheetId: id, csvFiles, tables };
};
