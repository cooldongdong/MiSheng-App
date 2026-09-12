// rowKey.js
// 「這一列是誰」的內部身分，與「創作者給它取的名字」（id）分開。
//
// **住在 shared 而不是 player**：流程圖（studio）與引擎（player）都要用同一套身分，
// 兩邊各寫一份的話，「圖上點的那一顆」跟「遊戲跳到的那一列」遲早會對不起來。
// eslint 的分層規則自己寫著「需要共用就往 shared/ 放」（見 eslint.config.js）。
//
// **為什麼要分開：** id 現在唯一的用途是**被別人指到**（`nextId` / `parentId` /
// `missionId`）。實測 demo 的 rundown 有 462 列，真正被指到的只有 55 列——
// 另外 407 列（88%）的 id 純粹是為了「每一列都要有」而填的白工，而 hint／prop／
// story 的 id 更是沒有任何表指向它們，100% 白工。
//
// 但引擎有七個地方拿 `row.id` 當身分（找目前這一列、parentId 比對、流程圖節點 key、
// 存檔…），所以 id 一旦可以留空，那些地方就沒有東西可用。這個檔補上那個東西：
//
//   **有名字就用名字，沒名字就用物理列號。**
//
// 於是 `nextId` / `parentId` 一行都不用改——它們指的一定是**有名字的列**，
// 而有名字的列 key 就等於 id。

// 掛在 row 物件上的欄位名。前後加底線是為了跟試算表的欄位分開；
// 匯出不受影響——`Papa.unparse` 是拿原始表頭當 `fields`，多掛的欄位漏不進去。
export const ROW_KEY = '__key';

// 「這一列整列都是空的」。**這個判準原本只活在 validator 裡**，於是 validator 會
// 把空白列過濾掉、播放器不會——同一份 CSV，兩邊看到的列數不一樣，validator 給綠燈
// 而播放器炸掉（2026-09-12，CSV 檔尾多一個換行造成的空列讓 getMissionById 命中它）。
//
// **為什麼是「標記」不是「移除」**：陣列索引就是試算表的列號。validator 的
// `sheetRow(i) = i + 2` 靠它報「第 21 列」，keyOf 對沒有 id 的列靠它產生 `#N`，
// 而那是玩家存檔的位置。少掉任何一列，錯誤訊息會指到隔壁，存檔會整批位移。
//
// 所以掛在這裡：withRowKeys 已經是「載入時替每一列掛上內部身分」的唯一位置，
// 空白與否是同一種性質，掛在同一個地方，兩邊就不可能算出兩個答案。
export const ROW_BLANK = '__blank';

const isEmptyValue = (v) =>
  v === undefined || v === null || String(v).trim() === '';

/** 整列都是空的嗎。**不看內部欄位**，只看試算表真的有的那些格。 */
export const isBlankRow = (row) =>
  !row ||
  typeof row !== 'object' ||
  Object.entries(row).every(
    ([k, v]) => k === ROW_KEY || k === ROW_BLANK || isEmptyValue(v)
  );

/** 讀旗標；沒掛過的（還沒經過 withRowKeys）就當場算一次。 */
export const isBlank = (row) =>
  row && ROW_BLANK in row ? Boolean(row[ROW_BLANK]) : isBlankRow(row);

/**
 * 從 index 往後找第一列「不是空白」的。流程要跳過空白列——
 * 沒有 model 的列在 PageSlot 會渲染成 null，玩家因此會翻到一頁什麼都沒有的畫面。
 * **跳過的是走訪，不是身分**：keyOf 仍然用物理列號，所以存檔不受影響。
 */
export const nextNonBlank = (rows, index) => {
  if (!Array.isArray(rows)) return null;
  for (let i = index; i < rows.length; i += 1) {
    if (!isBlank(rows[i])) return rows[i];
  }
  return null;
};

/** 欄位值正規化。跟 validator 的 norm 同一套，免得「這裡算相同、那裡算不同」。 */
export const normId = (v) =>
  v === null || v === undefined ? '' : String(v).trim();

/** 這一列的內部身分。沒有 id 的列用 `#物理列號`。 */
export const keyOf = (row) => (row ? (row[ROW_KEY] ?? normId(row.id)) : null);

/**
 * 載入時替每一列掛上內部身分。三條載入路徑（/create、/demo、獨立播放器）
 * 都經過 loadCSVData，所以掛在那裡就一次涵蓋全部。
 */
export const withRowKeys = (rows) => {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row, index) => {
    if (!row || typeof row !== 'object') return row;
    const id = normId(row.id);
    // 空白與否也在這裡算好。理由見 ROW_BLANK 的註解：下游只准讀旗標，
    // 不准各自再算一次——那正是 validator 與播放器分岔的成因。
    return { ...row, [ROW_KEY]: id || `#${index}`, [ROW_BLANK]: isBlankRow(row) };
  });
};

/**
 * 這一列的內容指紋——用來在「創作者插了一列」之後還找得到玩家停在哪。
 *
 * **不含 id 與內部 key。** 指紋要回答的是「這一列講的是同一件事嗎」，
 * 而 id 是名字、key 可能就是位置，兩個都不是內容。
 *
 * 已知的極限：**改掉玩家正踩著那一列的文字，指紋就對不上了**——而「修錯字」
 * 正是創作者最常做的修改。那種情況靠第三層（退回這一關的開頭）兜住，
 * 見 game-provider 的還原邏輯。
 */
export const fingerprintOf = (row, fields = null) => {
  if (!row || typeof row !== 'object') return '';
  // 給了欄位清單就只認那幾欄。**用在「同一列會被不同地方裝飾成不同形狀」的時候**
  // ——例如提示頁會替 hint 掛上 avatar，而導覽列的小紅點拿的是原始列；
  // 兩邊若都用「整個物件」算指紋，就會得到兩個不同的答案，紅點永遠不會消。
  const keys = fields
    ? fields
    : Object.keys(row).filter(
        (k) => k !== ROW_KEY && k !== ROW_BLANK && k !== 'id'
      );
  const parts = [...keys]
    .sort()
    .map((k) => `${k}=${normId(row[k])}`);
  // FNV-1a：夠短、夠穩定，而且不必為了這件事拉一個雜湊函式庫進來。
  // 這不是安全用途，碰撞的後果只是「還原到另一列」，而第 2 層本來就要求
  // **剛好一筆命中**才採用，兩列同時撞上的機率再乘一次。
  let h = 0x811c9dc5;
  const s = parts.join('');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
};

/**
 * 把存檔裡的位置還原成「這一份資料裡的哪一列」。三層退讓：
 *
 *   1. **key 還在，指紋也對得上** → 直接用（什麼都沒改時的快路徑）
 *   2. **指紋出現在別的地方，而且剛好一筆** → 用它（創作者插了／刪了列）
 *   3. **都不行** → 回 null，讓呼叫端退回那一關的開頭
 *
 * 第 2 層堅持「剛好一筆」：兩列內容一模一樣時（例如兩句都是「……」），
 * 猜錯的成本比退回關卡開頭高——**退回去玩家知道自己在哪，猜錯不會。**
 *
 * 沒有指紋的存檔（本功能之前存的，值是一個裸字串）只認 key，
 * 行為跟以前一模一樣——不會讓既有玩家掉存檔。
 */
export const resolvePosition = (rows, saved) => {
  if (!Array.isArray(rows) || !saved || !saved.key) return { key: null, how: 'lost' };
  const { key, fp } = saved;

  const atKey = rows.find((row) => keyOf(row) === key);
  if (atKey && (!fp || fingerprintOf(atKey) === fp)) return { key, how: 'exact' };

  if (fp) {
    const matches = rows.filter((row) => fingerprintOf(row) === fp);
    if (matches.length === 1) return { key: keyOf(matches[0]), how: 'moved' };
  }

  return { key: null, how: 'lost' };
};

/** 存檔要寫進去的形狀。key 記「是誰」，指紋記「講了什麼」——插列時只有後者還算數。 */
export const positionToSave = (rows, key) => {
  const row = Array.isArray(rows) ? rows.find((r) => keyOf(r) === key) : null;
  return row ? { key, fp: fingerprintOf(row) } : { key };
};

/** 讀存檔。舊格式是一個裸字串（只有 key），要相容。 */
export const parseSavedPosition = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.key) return parsed;
    if (typeof parsed === 'string') return { key: parsed };
  } catch {
    // 不是 JSON ＝ 舊格式，整串就是 key
  }
  return { key: String(raw) };
};
