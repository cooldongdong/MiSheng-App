// localFiles.js
// 全本機路線：CSV 和圖片都不上傳，直接在瀏覽器裡讀。
//
// 為什麼是「選檔案／選資料夾」而不是「填路徑」：網頁讀不到使用者打字給的本機路徑
// （瀏覽器的安全底線），但使用者主動選的檔案就讀得到，效果一樣。
// 圖片轉成 blob: 網址，重整就失效——正好對上 /create「一次性預覽」的定位。

import Papa from 'papaparse';
import { withRowKeys } from '../shared/rowKey';
import { REQUIRED_TABLES } from '../shared/validator/validateGame';

const IMG_EXT = /\.(png|jpe?g|webp|svg|gif|avif)$/i;

// 從檔名認出這是哪一張表：吃「demo - rundown.csv」與「rundown.csv」兩種寫法
const tableTypeOf = (fileName) => {
  const base = fileName.replace(/\.csv$/i, '').trim();
  const tail = base.includes(' - ') ? base.split(' - ').pop() : base;
  const key = tail.trim().toLowerCase();
  return REQUIRED_TABLES.includes(key) ? key : null;
};

/**
 * 讀一批本機 CSV，回傳跟 sheetLoader 完全相同的形狀
 *   csvFiles — `${type}CsvFile` 原始 CSV 字串，直接展開給 <GameController />
 *   tables   — { [type]: { fields, rows } }，餵給 validateGame()
 *   missing  — 沒對到的表名
 *   ignored  — 認不出是哪張表的檔名
 */
export const readLocalCsvFiles = async (fileList) => {
  const files = Array.from(fileList || []);
  const csvFiles = {};
  const tables = {};
  const ignored = [];

  await Promise.all(
    files.map(async (file) => {
      const type = tableTypeOf(file.name);
      if (!type) {
        ignored.push(file.name);
        return;
      }
      const csv = await file.text();
      csvFiles[`${type}CsvFile`] = csv;
      const result = Papa.parse(csv, { header: true, skipEmptyLines: false });
      // 同 sheetLoader：解析過的列一定要有內部身分，否則流程圖會把所有
      // 無名列當成同一個（見 shared/rowKey）
      tables[type] = {
        fields: result.meta.fields || [],
        rows: withRowKeys(result.data),
      };
    }),
  );

  const missing = REQUIRED_TABLES.filter((type) => !tables[type]);
  // 缺的表補 null，validateGame 會自己報「缺少整張表」
  for (const type of missing) tables[type] = null;

  return { csvFiles, tables, missing, ignored };
};

/**
 * 讀一個本機圖片資料夾，建「檔名 → blob: 網址」對照表。
 * 同時收 basename（fengmian.jpg）與相對路徑（img/fengmian.jpg），
 * 讓表格沿用現有的兩種填法。
 */
export const buildLocalImageMap = (fileList) => {
  const map = new Map();
  const urls = [];

  for (const file of Array.from(fileList || [])) {
    if (!IMG_EXT.test(file.name)) continue;

    const url = URL.createObjectURL(file);
    urls.push(url);

    const relPath = file.webkitRelativePath || file.name;
    // 去掉使用者選的那層資料夾名（demoImg/img/a.png → img/a.png）
    const withoutRoot = relPath.split('/').slice(1).join('/');

    for (const key of [file.name, relPath, withoutRoot]) {
      if (key && !map.has(key)) map.set(key, url);
    }
  }

  // 呼叫端在換一份／離開時要記得釋放，否則這些 blob 會一直佔記憶體
  const revoke = () => urls.forEach((u) => URL.revokeObjectURL(u));

  return { map, revoke, count: urls.length };
};

/**
 * 選一整個遊戲資料夾（CSV 和圖片都在裡面，含子資料夾如 img/）。
 * 使用者只做一個動作，程式自己分辨誰是資料、誰是圖片——
 * 心智模型跟現有的 `gameFile/{遊戲}/` 完全一樣：一個遊戲＝一個資料夾。
 */
export const readLocalGameFolder = async (fileList) => {
  const all = Array.from(fileList || []);
  const csvs = all.filter((f) => /\.csv$/i.test(f.name));
  const imgs = all.filter((f) => IMG_EXT.test(f.name));

  const { csvFiles, tables, missing, ignored } = await readLocalCsvFiles(csvs);
  const { map, revoke, count } = buildLocalImageMap(imgs);

  const folderName = all[0]?.webkitRelativePath?.split('/')[0] || '資料夾';

  return {
    csvFiles,
    tables,
    missing,
    ignored,
    imgMap: map,
    revokeImgs: revoke,
    imgCount: count,
    folderName,
  };
};
