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

// 表頭欄位分兩級（順序不論，只驗有沒有）。
//
// REQUIRED：缺這一欄就發 error 擋生成。
// OPTIONAL：認得，但可以沒有——缺了就是「這份遊戲沒用到那個功能」，不吭聲。
//
// 為什麼需要分級：**遊戲資料在創作者自己的雲端硬碟裡，不在我們的資料庫裡。**
// 一般服務要改 schema，寫一支 migration 半夜跑一遍就把舊資料升級完了；
// 這裡沒有那個權力——舊試算表只會停在它被做出來的那一天。
// 所以新增欄位如果進 REQUIRED，等於讓每一份既有遊戲在下一次驗證時集體變紅。
//
// ⇒ **以後任何新欄位一律先進 OPTIONAL_FIELDS，永遠不直接進 REQUIRED_FIELDS。**
//
// 既有欄位這次原封不動留在 REQUIRED：它們本來就在每一份現存試算表裡，
// 重新分級等於在改「什麼算錯」，那是另一個判斷，不該搭這班車。
export const REQUIRED_FIELDS = {
  character: ['id', 'name', 'avatar', 'straight'],
  config: ['id', 'title', 'description', 'duration', 'backgroundImg', 'developer', 'creator', 'designer', 'version', 'type', 'releaseDate', 'languagesSupported', 'contactInformation'],
  hint: ['id', 'missionId', 'speaker', 'text', 'img'],
  mission: ['id', 'subtitle', 'title', 'description', 'answer', 'similarAnswer', 'successText', 'giveUpText', 'confirmGiveUpText', 'backgroundImg', 'navigation'],
  prop: ['id', 'missionId', 'type', 'title', 'img', 'frontImg', 'rotateImg1', 'rotateImg2'],
  rundown: ['id', 'nextId', 'model', 'parentId', 'missionId', 'speaker', 'title', 'text', 'textAnimation', 'url', 'backgroundImg', 'customKey'],
  story: ['id', 'missionId', 'title', 'img'],
};

// 選填欄位：有就吃、沒有就當空字串，不報錯也不提醒。
// prop.backImg＝Wheel 最底層的固定背景圖（見 Wheel.jsx 的圖層說明）。
export const OPTIONAL_FIELDS = {
  prop: ['backImg'],
};

// 表頭上「兩級都不認得」的欄位。這種欄位的資料永遠不會被讀到，
// 而最常見的來源是打錯字（backImgg、rotateimg1）——填了沒反應，
// 又完全沒有回饋，只能自己盯著試算表找。
// 不擋生成：創作者在自己的表上加註記欄（「誰負責」「備註」）是很正常的事。
const knownFieldsOf = (type) =>
  new Set([...(REQUIRED_FIELDS[type] || []), ...(OPTIONAL_FIELDS[type] || [])]);

// rundown.model 合法值（見 GameController modelComponents）
export const VALID_MODELS = ['Talk', 'Quiz', 'MissionStart', 'MissionAnswerInput', 'Img', 'CustomValueInput'];
// prop.type 合法值（2026-08-25 加入 Camera：相機畫面上疊半透明圖的數位透明片）
export const VALID_PROP_TYPES = ['Img', 'Wheel', 'Camera'];

// 至少要有一筆資料的表（遊戲核心；hint/prop/story 允許整張空）
const MUST_HAVE_ROWS = ['character', 'mission', 'rundown'];
// missionId 的特例：0 代表「這一頁沒有對應關卡」（如序章對白），不視為斷鏈。
// 但 0 是「哨兵值」不是保留字——如果 mission 表真的有一列 id=0（例如拿它當入口關卡、
// 用 answer 收啟動碼），那 0 就是一個真關卡，此時不再視為「沒有關卡」。
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
    for (const f of REQUIRED_FIELDS[type]) {
      if (!fields.includes(f)) add(type, 1, f, `表頭缺少欄位「${f}」`);
    }
    // 選填欄位缺了不吭聲，但不認得的欄位要講——那格資料不會被讀到
    const known = knownFieldsOf(type);
    for (const f of fields) {
      // papaparse 遇到行尾多逗號會給出空字串欄名，那不是創作者打的欄位
      if (isEmpty(f)) continue;
      if (!known.has(f)) {
        warn(type, 1, f, `表頭有不認得的欄位「${f}」，這一欄的資料不會被讀取（是不是打錯字了？）`);
      }
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
      // Camera 道具沒有 img 就沒有透明片可疊，只會開出一片空相機——不是錯字，
      // 是這一列做不成事，所以是提醒不是 error
      if (norm(row.type) === 'Camera' && isEmpty(row.img)) {
        warn('prop', sheetRow(i), 'img', 'Camera 道具沒有填 img，打開相機後不會有東西疊上去');
      }
      // Wheel 是疊起來的多層圖：rotateImg1／rotateImg2 會轉，frontImg 蓋在最上面不轉。
      // frontImg 是選填的（沒有它版面也不會塌，見 Wheel.jsx 的量尺），
      // 但一張圖都沒有就沒東西可看，沒有 rotateImg1 就沒東西可轉。
      if (norm(row.type) === 'Wheel') {
        if (isEmpty(row.frontImg) && isEmpty(row.rotateImg1) && isEmpty(row.rotateImg2)) {
          warn('prop', sheetRow(i), 'rotateImg1', 'Wheel 道具沒有填任何圖（frontImg／rotateImg1／rotateImg2 全空），打開後會是空白');
        } else if (isEmpty(row.rotateImg1)) {
          warn('prop', sheetRow(i), 'rotateImg1', 'Wheel 道具沒有填 rotateImg1，轉盤上沒有可以轉的圖');
        }
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

  // mission 表真的有 id=0 這一列時，0 就不是哨兵值，而是一個真關卡
  const missionZeroIsReal = missionById.has(NO_MISSION);
  // 「這一列沒有對應關卡」＝欄位空；或填 0 而且 mission 表沒有 id=0 的關卡
  const isNoMission = (v) =>
    isEmpty(v) || (norm(v) === NO_MISSION && !missionZeroIsReal);

  // missionId → mission.id（hint / prop / story / rundown；空與 0 允許）
  for (const type of ['hint', 'prop', 'story', 'rundown']) {
    if (!tables[type]) continue;
    for (const { row, i } of rowsOf(type)) {
      if (isNoMission(row.missionId)) continue;
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
      if (isNoMission(row.missionId)) {
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
