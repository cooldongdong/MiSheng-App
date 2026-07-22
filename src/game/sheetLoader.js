// sheetLoader.js
// 即時轉化：從一份 Google 試算表的連結，抓出 7 張表的 CSV。
//
// 走 gviz endpoint：
//   https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=<分頁名>
// 選它的三個理由：
//   1. 吐純 CSV 文字 → 跟 gameFile/ 的 CSV 同一種東西，GameController／validator 都不用改
//   2. 回應帶 access-control-allow-origin → 瀏覽器可以直接 fetch，不用後端代理
//   3. 認分頁「名字」而不是爬 Google 的 HTML → Google 改版不會整組壞掉
//
// 前提：試算表要「共用給知道連結的任何人」，且 7 個分頁名固定為 REQUIRED_TABLES。

import Papa from 'papaparse';
import { REQUIRED_TABLES } from '../validator/validateGame';

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

const fetchSheetCsv = async (id, sheetName) => {
  const res = await fetch(gvizUrl(id, sheetName));

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

  const csvList = await Promise.all(
    REQUIRED_TABLES.map((type) => fetchSheetCsv(id, type))
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
