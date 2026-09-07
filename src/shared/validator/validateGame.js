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
  character: ['name', 'avatar', 'straight'],
  config: ['id', 'title', 'description', 'duration', 'backgroundImg', 'developer', 'creator', 'designer', 'version', 'type', 'releaseDate', 'languagesSupported', 'contactInformation'],
  hint: ['missionId', 'speaker', 'text', 'img'],
  mission: ['id', 'subtitle', 'title', 'description', 'answer', 'similarAnswer', 'successText', 'giveUpText', 'confirmGiveUpText', 'backgroundImg', 'navigation'],
  prop: ['missionId', 'type', 'title', 'img', 'frontImg', 'rotateImg1', 'rotateImg2'],
  rundown: ['id', 'nextId', 'model', 'parentId', 'missionId', 'speaker', 'title', 'text', 'textAnimation', 'url', 'backgroundImg', 'customKey'],
  story: ['missionId', 'title', 'img'],
};

// 選填欄位：有就吃、沒有就當空字串，不報錯也不提醒。
// prop.backImg＝Wheel 最底層的固定背景圖（見 Wheel.jsx 的圖層說明）。
export const OPTIONAL_FIELDS = {
  // config.recordUrl＝把玩家的遊戲紀錄送到哪裡（創作者自己的 Apps Script 網址，
  // 資料落在他自己的 Google 試算表）。留空就完全不送。
  //
  // **為什麼在 config 而不是別的地方**：它是整場遊戲的設定，不是某一關的性質
  // ——跟啟動碼、跟封面是同一個判斷。
  //
  // **它是公開的。** config.csv 玩家打得開，所以那條網址等於一把「可以寫進那張表」
  // 的鑰匙，任何人都能往裡面灌東西。擋不住（播放器本來就要讀那個檔），
  // n=50 的場合不是問題；公開販售的遊戲要重想。
  config: ['recordUrl'],
  // character.id 是歷史遺毒：角色一律靠 **name** 比對（rundown.speaker、hint.speaker），
  // 沒有任何一張表指向 character.id。
  //
  // **移到選填而不是刪掉**：刪掉的話它就變成「不認得的欄位」，validator 會對
  // 每一份既有試算表跳警告——而資料在創作者的雲端硬碟裡，我們沒有 migration 的權力。
  // 放這裡的話既有試算表完全不受影響（不吭聲），新的可以整欄不要。
  character: ['id'],
  // hint / prop / story 的 id 同理，而且比 character 更乾淨——
  // character.id 至少曾經是指標（rundown 早期用 id 指角色），
  // **這三張表的 id 從來沒有任何人指過**：三頁的清單都用 key={index}，
  // 提示的解鎖狀態已改成內容指紋（hintKeyOf），流程圖只吃 rundown。
  // 它純粹是「每張表都要有 id」那條老規則的副產品。
  // hint.timer＝進這一關之後第幾分鐘自動解鎖這一則（單位：分鐘）
  hint: ['id', 'timer'],
  prop: ['backImg', 'id'],
  story: ['id'],
};

// 表頭上「兩級都不認得」的欄位。這種欄位的資料永遠不會被讀到，
// 而最常見的來源是打錯字（backImgg、rotateimg1）——填了沒反應，
// 又完全沒有回饋，只能自己盯著試算表找。
// 不擋生成：創作者在自己的表上加註記欄（「誰負責」「備註」）是很正常的事。
const knownFieldsOf = (type) =>
  new Set([...(REQUIRED_FIELDS[type] || []), ...(OPTIONAL_FIELDS[type] || [])]);

// rundown.model 合法值（見 GameController modelComponents）
// GameStart＝遊戲封面，資料取自 config（見 player/game/GameStartModel.jsx）。
// 它是純增量的新值：既有試算表一格都不用改，照舊用 mission 0 那種假關卡當封面。
export const VALID_MODELS = ['Talk', 'Quiz', 'MissionStart', 'GameStart', 'MissionAnswerInput', 'Img', 'CustomValueInput'];
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
      // **config.id 不是普通的 id，它是存檔的命名空間。**
      //
      // game-provider 拿它當 localStorage 的前綴（`${gameId}_currentId`），
      // 空的話 getStorageKey 回 null，於是**所有存檔靜默不寫**——玩家一重整
      // 就從頭開始，而畫面上完全看不出原因。
      //
      // 底下「各表 id」那一段刻意跳過 config（它是單筆設定、不必驗唯一），
      // 而「不必驗唯一」被延伸成了「不必驗有沒有填」——**中間漏掉的是
      // 「它還有第二個工作」**。2026-09-04 Dong 把整份試算表的 id 清空來測
      // COO-136 時撞到：遊戲玩得下去，但什麼都沒記住。
      if (isEmpty(row.id)) {
        add('config', sheetRow(i), 'id', 'id 不可空白——它是這個遊戲存檔的名字，空白的話玩家的進度不會被記住（重整就從頭開始）');
      }
    }
  }

  // ---- 層 2 + 3：id 唯一；只有「會被指到」的表才必填 ----
  //
  // **id 唯一的用途是被別人指到。** 手填 id 很累，但實測 demo 的 rundown 有 462 列，
  // 真正被 nextId / parentId 指到的只有 55 列——另外 407 列（88%）純粹是為了
  // 「每一列都要有」而填的白工；hint / prop / story / character 更是**沒有任何表
  // 指向它們**，100% 白工（character 是靠 name 比對的，見 TalkModel）。
  //
  // 所以只有 mission 仍然必填——hint / prop / story / rundown 的 missionId 都指向它。
  // rundown 的 id 可以留空，但**有填的仍須唯一**，否則 nextId 會指到兩個地方。
  //
  // 引擎那邊的配套：沒有 id 的列改用物理列號當內部身分（見 player/game/rowKey.js）。
  // **兩者必須一起生效**——validator 放行而引擎沒有 fallback，會變成
  // 「檢查通過、遊戲卻壞掉」，跟 PR #4 那次「validator 放行、遊戲靜默卡在 Loading」
  // 是同一種錯。
  // 兩個常數，一條規則：**id 唯一的用途是被別人指到。**
  //
  // ID_REQUIRED＝幾乎每一列都會被指到，所以必填。只剩 mission。
  // ID_CHECKED＝id 有可能被指到，所以「有填就得唯一」。多一個 rundown（nextId／parentId）。
  //
  // 落在兩個集合外的表（character / hint / prop / story）連唯一都不驗——
  // **一個沒有人指的欄位重複了，報錯是噪音**。它們的 id 都已經在 OPTIONAL_FIELDS，
  // 留著不吭聲、整欄不要也不吭聲。
  //
  // config 不在這裡不是因為它「單筆不必驗唯一」，而是它根本不走這條路：
  // config.id 是存檔的命名空間，必填檢查寫在上面 config 那一段（2026-09-04 的教訓——
  // 「不必驗唯一」曾經被延伸成「不必驗有沒有填」）。
  const ID_REQUIRED_TABLES = new Set(['mission']);
  const ID_CHECKED_TABLES = new Set(['mission', 'rundown']);
  for (const type of REQUIRED_TABLES) {
    if (!tables[type] || !ID_CHECKED_TABLES.has(type)) continue;
    const seen = new Map();
    for (const { row, i } of rowsOf(type)) {
      if (isEmpty(row.id)) {
        if (ID_REQUIRED_TABLES.has(type)) {
          add(type, sheetRow(i), 'id', 'id 不可空白（其他表的 missionId 要指到它）');
        }
        continue;
      }
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
      // Wheel 是疊起來的多層圖，由下往上：backImg（不轉）→ rotateImg2 → rotateImg1
      // → frontImg（不轉）。四層都是選填的（沒有它們版面也不會塌，見 Wheel.jsx 的量尺），
      // 但一張圖都沒有就沒東西可看，沒有 rotateImg1 就沒東西可轉。
      if (norm(row.type) === 'Wheel') {
        if (isEmpty(row.backImg) && isEmpty(row.frontImg) && isEmpty(row.rotateImg1) && isEmpty(row.rotateImg2)) {
          warn('prop', sheetRow(i), 'rotateImg1', 'Wheel 道具沒有填任何圖（backImg／frontImg／rotateImg1／rotateImg2 全空），打開後會是空白');
        } else if (isEmpty(row.rotateImg1)) {
          warn('prop', sheetRow(i), 'rotateImg1', 'Wheel 道具沒有填 rotateImg1，轉盤上沒有可以轉的圖');
        }
      }
    }
  }

  // ---- character 的身分是 name，所以要照身分來驗 ----
  //
  // **一直以來被檢查的是沒有人在讀的那一個。** id 驗了唯一，但角色是靠 name 比對的
  //（TalkModel／HintPage 都是 `find(char => char.name === row.speaker)`），
  // 而 name 從來沒有驗過必填、更沒有驗過唯一。
  //
  // 兩個角色同名時，find 永遠只會找到第一個——第二個角色的立繪與頭像會靜靜地
  // 變成第一個的。不報錯、不空白，就是換了張臉。
  if (tables.character) {
    const seenName = new Map();
    for (const { row, i } of rowsOf('character')) {
      if (isEmpty(row.name)) {
        add('character', sheetRow(i), 'name', 'name 不可空白（rundown 與 hint 的 speaker 是靠它找到這個角色的）');
        continue;
      }
      const key = norm(row.name);
      if (seenName.has(key)) {
        add('character', sheetRow(i), 'name', `name「${key}」重複（也出現在第 ${seenName.get(key)} 列）。同名的角色只會用到第一個，後面那個的立繪與頭像不會出現`);
      } else seenName.set(key, sheetRow(i));
    }
  }

  // ---- speaker 要指到登記過的角色 ----
  //
  // **rundown 是 error**（Dong 2026-09-04 拍板）：是角色就要登記。
  // 不想登記的話有退路——**留空 speaker、改填 title**，畫面上照樣顯示那個名字
  //（TalkModel 是 `title || speaker`），而且不會去查角色表。
  //
  // **hint 只是 warn**：hint 沒有 title 欄位，所以那條退路在這裡不存在；
  // 而且後果比較輕——只是沒有頭像，名字仍然照樣顯示（見 HintContent）。
  if (tables.character) {
    const names = new Set(
      rowsOf('character').map(({ row }) => norm(row.name)).filter((x) => x !== '')
    );
    if (tables.rundown) {
      for (const { row, i } of rowsOf('rundown')) {
        if (isEmpty(row.speaker)) continue;
        if (!names.has(norm(row.speaker))) {
          add('rundown', sheetRow(i), 'speaker', `speaker「${row.speaker}」在 character 表找不到這個角色（立繪與頭像不會出現）。不想登記角色的話，把 speaker 留空、改用 title 寫名字`);
        }
      }
    }
    if (tables.hint) {
      for (const { row, i } of rowsOf('hint')) {
        if (isEmpty(row.speaker)) continue;
        if (!names.has(norm(row.speaker))) {
          warn('hint', sheetRow(i), 'speaker', `speaker「${row.speaker}」在 character 表找不到這個角色，這一則提示不會有頭像（名字仍會顯示）`);
        }
      }
    }
  }

  // config.recordUrl 填了但不像 Apps Script 的網址。
  //
  // **是提醒不是 error**：填錯的後果是「資料靜默地收不到」，而遊戲照樣玩得下去
  // ——擋生成沒有道理。但這一格的失敗方式特別惡劣（活動結束才發現一筆都沒有，
  // 而那時資料已經永遠沒了），所以寧可話多一點。
  //
  // 只檢查形狀，不檢查通不通——真的通不通要靠 /create 的「測試連線」，
  // 那是唯一問得到答案的方式（跨來源的回應是不透明的，程式讀不到）。
  if (tables.config) {
    for (const { row, i } of rowsOf('config')) {
      if (isEmpty(row.recordUrl)) continue;
      const url = norm(row.recordUrl);
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
        warn('config', sheetRow(i), 'recordUrl', `recordUrl「${row.recordUrl}」看起來不是 Apps Script 的網頁應用程式網址（應該長得像 https://script.google.com/macros/s/xxxxx/exec）。填錯的話遊戲照樣能玩，但玩家的紀錄會靜靜地收不到`);
      }
    }
  }

  // hint.timer 填了但不是合法分鐘數 —— 那一則就完全不會自動解鎖，而畫面上看不出原因。
  // 是提醒不是 error：填錯的是一個選填功能，遊戲照樣玩得下去（播放器會當它沒填）。
  //
  // **0 是合法的**，意思是「進關就解鎖」——空白才是「不自動解鎖」。
  if (tables.hint) {
    for (const { row, i } of rowsOf('hint')) {
      if (isEmpty(row.timer)) continue;
      const minutes = Number(norm(row.timer));
      if (!Number.isFinite(minutes) || minutes < 0) {
        warn('hint', sheetRow(i), 'timer', `timer「${row.timer}」不是合法的分鐘數（填 3 代表進關後第 3 分鐘自動解鎖，填 0 代表進關就解鎖，留空代表只能手動解鎖），這一則不會自動解鎖`);
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

  // ---- 層 2（延伸）：兩種「開始」的 missionId 規則相反 ----
  //
  // | | GameStart | MissionStart |
  // | 資料來源 | config | mission 那一列 |
  // | missionId | **必須空白** | **必須指到關卡** |
  //
  // MissionStart 這一條以前驗不了：封面就是一列 `missionId=0` 的 MissionStart，
  // 而「忘了填 missionId」跟「刻意做的封面」長得一模一樣——**用空白表達意圖，
  // 等於放棄偵測錯誤的能力**。有了 GameStart，封面不再需要借用這個位置，
  // 這一條才驗得起來。
  //
  // 而它擋的是一個會整頁全黑的狀態：MissionStartModel 讀 currentMission.navigation
  // 時沒有 null 防護，指不到關卡就直接爆掉（2026-09-04 實際撞到）。
  if (tables.rundown) {
    let gameStartRow = null;
    for (const { row, i } of rowsOf('rundown')) {
      const model = norm(row.model);

      if (model === 'GameStart') {
        if (!isEmpty(row.missionId)) {
          add('rundown', sheetRow(i), 'missionId', 'GameStart 是遊戲封面，資料取自 config（title／description／backgroundImg），missionId 要留空。想做的是關卡開場的話，model 改成 MissionStart');
        }
        // 封面只會有一張：流程從第一列走起，第二個 GameStart 只會是誤複製。
        // 不擋生成——它不會讓遊戲壞掉，只是走到那裡時關卡狀態會被清空。
        if (gameStartRow) {
          warn('rundown', sheetRow(i), 'model', `這是第 2 個 GameStart（第一個在第 ${gameStartRow} 列）。封面只需要一列，走到這一列時玩家的關卡狀態會被清掉`);
        } else gameStartRow = sheetRow(i);
        continue;
      }

      if (model !== 'MissionStart') continue;
      if (isNoMission(row.missionId)) {
        add('rundown', sheetRow(i), 'missionId', 'MissionStart 需要 missionId 指向這一關（關卡名、背景圖、導航都從那一列讀，指不到會整頁全黑）。這一列如果是遊戲封面，model 改成 GameStart、missionId 留空');
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
