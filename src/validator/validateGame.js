// validateGame.js
// misheng CSV validator — 純函式核心（CLI 與即時轉化 web 共用同一顆）
//
// 輸入：tables = { [type]: { fields: string[], rows: object[] } | null }
//   - fields：CSV 表頭欄位（papaparse meta.fields）
//   - rows：papaparse header:true 解析出的資料列
//   - 某表檔案不存在時傳 null
// 輸出：issues = [{ table, row, column, message }]
//   - row 為「試算表列號」（表頭佔第 1 列，資料從第 2 列起）；整表層級的問題 row=null
//
// v1 涵蓋層 1–5（結構／必填／id 完整性／參照／列舉值），全部視為「要修才給生成」。
// 層 6（流程可達性、迴圈、{{變數}} 對應）留 v2。

export const REQUIRED_TABLES = ['character', 'config', 'hint', 'mission', 'prop', 'rundown', 'story'];

// 每張表的預期表頭（順序不論，只驗有沒有）
export const EXPECTED_FIELDS = {
  character: ['id', 'name', 'avatar', 'straight'],
  config: ['id', 'title', 'description', 'duration', 'backgroundImg', 'developer', 'creator', 'designer', 'version', 'type', 'releaseDate', 'languagesSupported', 'contactInformation'],
  hint: ['id', 'missionId', 'speaker', 'text', 'img'],
  mission: ['id', 'subtitle', 'title', 'description', 'answer', 'similarAnswer', 'successText', 'giveUpText', 'confirmGiveUpText', 'backgroundImg', 'navigation'],
  prop: ['id', 'missionId', 'type', 'title', 'img', 'frontImg', 'rotateImg1', 'rotateImg2'],
  rundown: ['id', 'nextId', 'model', 'parentId', 'missionId', 'speaker', 'title', 'text', 'textAnimation', 'url', 'backgroundImg', 'customKey'],
  story: ['id', 'missionId', 'title', 'img'],
};

// rundown.model 合法值（見 GameController modelComponents）
export const VALID_MODELS = ['Talk', 'Quiz', 'MissionStart', 'MissionAnswerInput', 'Img', 'CustomValueInput'];
// prop.type 合法值（Dong 2026-07-21：目前只有 Img 跟 Wheel）
export const VALID_PROP_TYPES = ['Img', 'Wheel'];

// 至少要有一筆資料的表（遊戲核心；hint/prop/story 允許整張空）
const MUST_HAVE_ROWS = ['character', 'mission', 'rundown'];
// missionId 的特例：0 代表「這一頁沒有對應關卡」（如序章對白），不視為斷鏈
const NO_MISSION = '0';

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';
const isBlankRow = (row) => !row || Object.values(row).every(isEmpty);
const norm = (v) => String(v).trim();
// papaparse 資料 index → 試算表列號
const sheetRow = (i) => i + 2;

export function validateGame(tables) {
  const issues = [];
  const add = (table, row, column, message) => issues.push({ level: 'error', table, row, column, message });
  const warn = (table, row, column, message) => issues.push({ level: 'warn', table, row, column, message });

  // 取某表「非空白」的資料列，保留原始 index（供列號報告）
  const rowsOf = (type) =>
    (tables[type]?.rows || [])
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => !isBlankRow(row));

  // ---- 層 1：結構（表存在 + 表頭欄位齊全 + 核心表非空）----
  for (const type of REQUIRED_TABLES) {
    if (!tables[type]) {
      add(type, null, null, `缺少整張表（找不到「${type}」的 CSV）`);
      continue;
    }
    const fields = tables[type].fields || [];
    for (const f of EXPECTED_FIELDS[type]) {
      if (!fields.includes(f)) add(type, 1, f, `表頭缺少欄位「${f}」`);
    }
  }
  for (const type of MUST_HAVE_ROWS) {
    if (tables[type] && rowsOf(type).length === 0) add(type, null, null, `${type} 沒有任何資料列`);
  }

  // config 恰好一筆 + title 必填
  if (tables.config) {
    const configRows = rowsOf('config');
    if (configRows.length === 0) add('config', null, null, 'config 沒有任何資料（需要一筆遊戲設定）');
    else if (configRows.length > 1) add('config', sheetRow(configRows[1].i), null, `config 應該只有一筆，卻有 ${configRows.length} 筆`);
    for (const { row, i } of configRows) {
      if (isEmpty(row.title)) add('config', sheetRow(i), 'title', '遊戲標題 title 不可空白');
    }
  }

  // ---- 層 2 + 3：各表 id 必填、唯一（config 除外，它是單筆設定）----
  for (const type of REQUIRED_TABLES) {
    if (!tables[type] || type === 'config') continue;
    const seen = new Map();
    for (const { row, i } of rowsOf(type)) {
      if (isEmpty(row.id)) { add(type, sheetRow(i), 'id', 'id 不可空白'); continue; }
      const key = norm(row.id);
      if (seen.has(key)) add(type, sheetRow(i), 'id', `id「${key}」重複（也出現在第 ${seen.get(key)} 列）`);
      else seen.set(key, sheetRow(i));
    }
  }

  // 註：rundown.id 不必連續、不必從 1 開始、也不必是數字（可用語意名稱當 id）。
  // 流程靠「物理 row 順序」推進（見 useNextId），分支靠 nextId 字串比對，
  // 起點取 rundown 第一列（見 game-provider）——都不看 id 的數值。
  // id 只要「非空且唯一」即可（上一段已驗）；指向是否存在，由層 4 的參照檢查把關。
  // ⚠️ 不要把「id 必須連續」加回來：那是舊 id+1 推進的遺留，會擋掉完全合法的資料。

  // rundown.model 必填 + 合法
  if (tables.rundown) {
    for (const { row, i } of rowsOf('rundown')) {
      if (isEmpty(row.model)) add('rundown', sheetRow(i), 'model', 'model 不可空白');
      else if (!VALID_MODELS.includes(norm(row.model))) add('rundown', sheetRow(i), 'model', `model「${row.model}」不是合法值（應為 ${VALID_MODELS.join(' / ')}）`);
    }
  }

  // prop.type 合法（非空時）
  if (tables.prop) {
    for (const { row, i } of rowsOf('prop')) {
      if (!isEmpty(row.type) && !VALID_PROP_TYPES.includes(norm(row.type))) {
        add('prop', sheetRow(i), 'type', `type「${row.type}」不是合法值（應為 ${VALID_PROP_TYPES.join(' / ')}）`);
      }
    }
  }

  // ---- 層 4：參照完整性 ----
  const idSetOf = (type) => new Set(rowsOf(type).map(({ row }) => norm(row.id)).filter((x) => x !== ''));
  const missionIds = idSetOf('mission');
  const rundownIds = idSetOf('rundown');

  const missionRowNum = new Map(); // missionId → 試算表列號
  const missionById = new Map();
  for (const { row, i } of rowsOf('mission')) {
    const key = norm(row.id);
    missionRowNum.set(key, sheetRow(i));
    missionById.set(key, row);
  }

  // missionId → mission.id（hint / prop / story / rundown；空與 0 允許）
  for (const type of ['hint', 'prop', 'story', 'rundown']) {
    if (!tables[type]) continue;
    for (const { row, i } of rowsOf(type)) {
      if (isEmpty(row.missionId) || norm(row.missionId) === NO_MISSION) continue;
      if (!missionIds.has(norm(row.missionId))) add(type, sheetRow(i), 'missionId', `missionId「${row.missionId}」在 mission 表找不到對應關卡`);
    }
  }

  // rundown.parentId / nextId → rundown.id（非空時）
  if (tables.rundown) {
    for (const { row, i } of rowsOf('rundown')) {
      for (const col of ['parentId', 'nextId']) {
        if (isEmpty(row[col])) continue;
        if (!rundownIds.has(norm(row[col]))) add('rundown', sheetRow(i), col, `${col}「${row[col]}」在 rundown 表找不到對應 id（流程會斷掉）`);
      }
    }
  }

  // ---- 層 2（延伸）：MissionAnswerInput 的關卡必須有 answer ----
  // Dong 3-1：透過 MissionAnswerInput 輸入的要跟答案一模一樣 → 該關卡 answer 不可空
  if (tables.rundown) {
    for (const { row, i } of rowsOf('rundown')) {
      if (norm(row.model) !== 'MissionAnswerInput') continue;
      if (isEmpty(row.missionId) || norm(row.missionId) === NO_MISSION) {
        add('rundown', sheetRow(i), 'missionId', 'MissionAnswerInput 需要 missionId 指向要作答的關卡');
        continue;
      }
      const m = missionById.get(norm(row.missionId));
      if (m && isEmpty(m.answer)) {
        warn('mission', missionRowNum.get(norm(row.missionId)), 'answer', `關卡「${row.missionId}」是要玩家輸入答案的關卡，但 answer 欄位是空值——這代表玩家不用輸入答案就能通關，請確認是否是刻意這樣設計的`);
      }
    }
  }

  return issues;
}
