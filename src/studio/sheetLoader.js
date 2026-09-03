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
    if (res.status === 404) {
      throw new Error(`找不到名為「${sheetName}」的分頁`);
    }
    throw new Error(`讀取「${sheetName}」分頁失敗（HTTP ${res.status}）`);
  }

  const text = await res.text();

  // 權限沒開時 Google 不會給 4xx，而是回一頁登入 HTML
  if (/^\s*</.test(text)) {
    throw new Error('讀不到試算表內容，請確認已「共用給知道連結的任何人」');
  }

  return text;
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

  // 先問一次分頁的 gid。拿不到就整組走 gviz（見 fetchSheetGids 的註解）。
  // 只問一次：七張表共用同一份對照，不必問七遍。
  const gids = await fetchSheetGids(id);

  const csvList = await Promise.all(
    REQUIRED_TABLES.map((type) => fetchSheetCsv(id, type, gids?.[type]))
  );

  const csvFiles = {};
  const tables = {};

  REQUIRED_TABLES.forEach((type, i) => {
    const csv = csvList[i];
    csvFiles[`${type}CsvFile`] = csv;

    const result = Papa.parse(csv, { header: true, skipEmptyLines: false });
    tables[type] = { fields: result.meta.fields || [], rows: result.data };
  });

  return { spreadsheetId: id, csvFiles, tables };
};
