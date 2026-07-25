// checkSheetImages.js
// 只給即時轉化（/create）用的檢查：圖片欄位必須是「網址」。
//
// 為什麼不放進共用 validator：build-time 的遊戲（src/gameFile/）圖片本來就填檔名，
// 那是合法的；只有從試算表來的遊戲沒有本機檔案，非網址一定顯示不出來。
//
// 最常見的踩雷：把 Drive 連結貼進 Google 試算表，會被自動轉成「智慧型晶片」，
// 這時匯出的值變成檔名而不是網址——畫面上看起來有連結，實際上抓不到。
//
// 輸出刻意「每個表＋欄位聚合成一條」：整份試算表的圖片欄位動輒上百格，
// 逐格報會變成沒人看的文字牆。

// 各表的圖片欄位（對照 7 張表 schema）
const IMG_FIELDS = {
  config: ['backgroundImg'],
  character: ['avatar', 'straight'],
  mission: ['backgroundImg'],
  rundown: ['backgroundImg'],
  hint: ['img'],
  prop: ['img', 'frontImg', 'rotateImg1', 'rotateImg2'],
  story: ['img'],
};

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';
const sheetRow = (i) => i + 2;
const short = (v) => {
  const s = String(v).trim();
  return s.length > 30 ? `${s.slice(0, 30)}…` : s;
};

const SMART_CHIP_HINT =
  '提醒：把 Google 雲端硬碟連結貼進試算表時，常會被自動轉成「智慧型晶片」，' +
  '匯出後就變成檔名而不是網址。用「編輯 → 選擇性貼上 → 只貼上值」貼純文字連結可以避免。';

/**
 * @param tables  { [type]: { fields, rows } }
 * @param imgMap  本機圖片資料夾對照表（沒選資料夾時為 null）
 */
export const checkSheetImages = (tables, imgMap = null) => {
  const issues = [];
  let total = 0;

  const inLocalFolder = (value) => {
    if (!imgMap) return false;
    const key = String(value).trim().replace(/^\/+/, '');
    return imgMap.has(key) || imgMap.has(key.split('/').pop());
  };

  for (const [table, columns] of Object.entries(IMG_FIELDS)) {
    const rows = tables[table]?.rows || [];

    for (const column of columns) {
      const bad = [];
      rows.forEach((row, i) => {
        if (!row) return;
        const value = row[column];
        if (isEmpty(value)) return;
        if (/^https?:\/\//i.test(String(value).trim())) return;
        if (inLocalFolder(value)) return;
        bad.push({ row: sheetRow(i), value });
      });

      if (!bad.length) continue;
      total += bad.length;

      const sample = bad
        .slice(0, 3)
        .map((b) => `第 ${b.row} 列「${short(b.value)}」`)
        .join('、');
      const more = bad.length > 3 ? ` 等 ${bad.length} 格` : '';

      issues.push({
        level: 'warn',
        table,
        row: null,
        column,
        message: imgMap
          ? `${bad.length} 格的圖在你選的資料夾裡找不到（${sample}${more}），這些圖在畫面上會是空的。` +
            '請確認檔名一模一樣（含大小寫與副檔名），或改填圖片網址。'
          : `${bad.length} 格填的不是圖片網址（${sample}${more}），這些圖在畫面上會是空的。` +
            '請改填網址，或改用「本機圖片資料夾」讓程式用檔名去對。',
      });
    }
  }

  if (total > 0 && !imgMap) {
    issues.push({
      level: 'warn',
      table: 'config',
      row: null,
      column: null,
      message: SMART_CHIP_HINT,
    });
  }

  return issues;
};
