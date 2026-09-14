/**
 * misheng 遊戲紀錄接收器 ＋ 報表          v3
 *
 * 用法：
 *   1. 開一張新的 Google 試算表
 *   2. 擴充功能 → Apps Script，把這整份貼上（全選蓋掉原本的內容）
 *   3. 部署 → 新增部署作業 → 類型「網頁應用程式」
 *        執行身分：我      具有存取權的使用者：任何人
 *   4. 複製那條 /exec 網址，貼進試算表 config 表的 recordUrl 欄位
 *
 * 改過程式碼之後一定要重新部署，否則跑的還是舊版：
 *   部署 → 管理部署作業 →（鉛筆）→ 版本選「新版本」→ 部署   ← 網址不會變
 *   「存檔」不等於「部署」，而且失敗完全沒有訊號。
 *   表頭最後一欄寫著 (v3) 就代表新版真的在跑。
 */

const SHEET_NAME = '遊戲紀錄';
const REPORT_NAME = '報表';
const SESSIONS_NAME = '場次';
const HEADER = ['事件 id', '遊戲', '這局玩家', '時間', '事件', '關卡', '內容 (v3)'];

// ======================== 收資料 ========================

// **鎖裡面不可以有任何跟「表已經多長」有關的動作。**
//
// 這是 2026-09-09 壓測出來的教訓。當時鎖裡面有兩件 O(列數) 的事——整欄讀回來做
// 去重、以及對 D:D／A:C／F:G 整欄重設格式——量到的結果是：**表幾乎是空的時候，
// 每個請求就已經佔住鎖約 0.78 秒**。
//
// 那個數字放進活動的規模裡是這樣：30 秒的窗口最多放得過 38 個請求，而 50 支手機
// 每 30 秒各送一次＝需求 50。**供給在表還空著的時候就已經比需求少三成**，而擠不
// 進去的請求下一輪會重送（水位只在成功時前進），所以隊伍只會越排越長。
//
// ⇒ 現在鎖裡面只剩「問最後一列是第幾列、把資料寫下去」，跟表有多長無關。
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const events = data.events || [];

  // **解析與組裝放在鎖外面。** 它們跟別人沒有衝突，沒有理由佔著門口做。
  const rows = events
    .filter(function (ev) { return ev && ev.id; })
    .map(function (ev) {
      return [ev.id, data.gameId || '', data.sid || '', new Date(ev.ts),
              ev.type || '', ev.missionId || '', ev.value || ''];
    });

  // 50 個人可能同時送。沒有鎖的話，兩筆會問到同一個「最後一列」、蓋掉彼此
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getLogSheet_();
    if (rows.length) {
      const start = sheet.getLastRow() + 1;
      // 格式要在 setValues **之前**設好，否則試算表會先把 "007" 吃成 7、
      // 把 "1-2" 變成日期——那是 2026-09-07 踩過的坑，順序不能顛倒。
      //
      // **但只設這幾列，不設整欄。** 整欄是 O(列數)，而它每一次請求都要跑。
      setRowFormats_(sheet, start, rows.length);
      sheet.getRange(start, 1, rows.length, HEADER.length).setValues(rows);
    }
    return ContentService.createTextOutput('ok ' + rows.length);
  } finally {
    lock.releaseLock();
  }
}

// 這幾列的欄位格式。
//   D 欄：預設格式只顯示日期，而「每關花多久」全靠時分秒
//   A:C／F:G：試算表會把 "007" 變成 7、把 "1-2" 變成日期
function setRowFormats_(sheet, start, n) {
  sheet.getRange(start, 1, n, 3).setNumberFormat('@');
  sheet.getRange(start, 4, n, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(start, 6, n, 2).setNumberFormat('@');
}

function getLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  // **格式不在這裡設。**
  //
  // 原本這裡對 D:D／A:C／F:G 整欄 setNumberFormat，理由是「每次都設，才不怕
  // 創作者刪分頁、改名、手動貼東西」——那個理由沒有錯，錯的是**位置**：
  // 整欄是 O(列數)，而這個函式在鎖裡面、每一個請求都會經過。
  //
  // 現在改成只設「這次要寫的那幾列」（見 setRowFormats_）。防呆性質一樣在——
  // 每一批寫進去的資料都會自己帶格式，不依賴任何「第一次」。
  return sheet;
}

// ======================== 報表 ========================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('謎生')
    .addItem('重算報表', 'rebuildReport')
    .addItem('建立／檢查「場次」表', 'ensureSessions')
    .addToUi();
}


// ======================== 場次 ========================
//
// 一張表裡會混進好幾種資料：你自己的測試、正式活動、隔週的第二場。全部算在一起
// 會把測試的數字混進正式的統計裡，而那件事**看不出來**——報表只會給你一個比較平的
// 平均值。
//
// 做法是讓創作者自己填時間段，**而不是我們猜**（按日期切、按空檔切都會在某些排法
// 下切錯，而切錯的報表跟切對的長得一模一樣）。
//
// 三個刻意的決定：
//
// 1. **沒填任何一列就跟以前完全一樣**（全部算成一份）。既有的試算表不用做任何事。
// 2. **不在任何場次裡的資料會自成一段「其他」，不會被丟掉。** 這跟去重那邊
//    「多一列重複看得出來，少一列資料看不出來」是同一個判斷——篩掉的資料不會有人
//    發現，所以寧可讓它礙眼。
// 3. **報表最上面一定印出目前的場次設定。** 沒有這一段的話，時間段就變成一個藏
//    起來的狀態：你看著一張報表，卻不知道它算的是哪一段——那正是當初否決「選哪一款
//    遊戲的下拉選單」的理由。

function ensureSessions() {
  ensureSessionsSheet_(SpreadsheetApp.getActiveSpreadsheet());
  SpreadsheetApp.getUi().alert(
    '「' + SESSIONS_NAME + '」表已經在了。\n\n' +
    '填好時間段之後，回到「謎生 → 重算報表」，報表就會照場次分開。\n' +
    '一列都不填的話，報表跟以前一樣把全部算成一份。'
  );
}

function ensureSessionsSheet_(ss) {
  let sh = ss.getSheetByName(SESSIONS_NAME);
  if (sh) return sh;
  sh = ss.insertSheet(SESSIONS_NAME);
  sh.getRange(1, 1, 1, 3).setValues([['場次名稱', '開始（含）', '結束（不含）']]);
  sh.getRange(2, 1, 2, 3).setValues([
    ['（範例）試玩測試', '', '2026-09-20 08:00'],
    ['（範例）正式活動', '2026-09-20 08:00', ''],
  ]);
  sh.getRange(5, 1).setValue(
    '說明：開始或結束留空＝那一邊不限。把「（範例）」那兩列改成你自己的場次，' +
    '或整列刪掉。一列都沒有的話，報表會把全部資料算成一份。'
  );
  sh.getRange(1, 1, 1, 3).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 160);
  sh.setColumnWidth(2, 150);
  sh.setColumnWidth(3, 150);
  return sh;
}

// 試算表的日期欄可能回 Date，也可能回字串（看使用者怎麼填的）。
// 兩種都吃，看不懂就當作沒填——**寧可算得比較寬，也不要靜默地少算一段**。
function toDate_(v) {
  if (v instanceof Date) return v;
  const t = String(v || '').trim();
  if (!t) return null;
  const d = new Date(t.replace(/-/g, '/')); // Safari/舊 runtime 對 'YYYY-MM-DD hh:mm' 較挑
  return isNaN(d.getTime()) ? null : d;
}

function readSessions_(ss) {
  const sh = ss.getSheetByName(SESSIONS_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  return vals.map(function (r) {
    return { name: String(r[0] || '').trim(), from: toDate_(r[1]), to: toDate_(r[2]) };
  }).filter(function (x) {
    // 名稱空白、或範例列沒被改過就跳過——不然第一次用的人會拿到兩段空報表
    return x.name && x.name.indexOf('（範例）') !== 0;
  });
}

function inSession_(r, s) {
  if (s.from && r.time < s.from) return false;
  if (s.to && r.time >= s.to) return false;
  return true;
}

/**
 * 把「遊戲紀錄」算成一張看得懂的報表。
 *
 * 手動觸發（謎生 → 重算報表），不做成「收到資料就重算」——50 個人同時送的時候
 * 那會拖垮寫入，而這份資料是活動結束後才要看的，不是即時儀表板。
 *
 * 也因為是手動的，報表第一行一定要寫「資料截至什麼時候」——否則你會看著一張
 * 三天前的報表以為它是最新的。
 */
function rebuildReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = ss.getSheetByName(SHEET_NAME);
  if (!log || log.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('「' + SHEET_NAME + '」還沒有資料。');
    return;
  }

  // **去重在這裡做，不在寫入的時候做。**
  //
  // 補送與重試會讓同一個事件 id 出現兩次。原本是在 doPost 裡擋掉的，代價是
  // 每一次寫入都要把整欄讀回來——而那件事在 50 個人同時玩的時候會塞住門口
  //（見 doPost 的檔頭）。搬到這裡之後：原始 log 可能有重複的列（無害），
  // 但**報表看到的每個事件仍然只有一次**，保證沒有變，只是換個地方兌現。
  const values = log.getRange(2, 1, log.getLastRow() - 1, HEADER.length).getValues();
  //
  // **沒有 id 的列不參與去重，但也不丟掉。** 第一版寫成 `if (!id) return false`，
  // 於是創作者手動貼進來的、或匯入舊資料時掉了 id 的列會**無聲消失**——
  // 而舊版（去重在寫入端做的時候）那些列是留著的。
  // 去重的目的是「同一筆不要算兩次」，不是「沒有編號的就不算數」；
  // **多一列重複看得出來，少一列資料看不出來。**
  const seenId = {};
  const rows = values.filter(function (r) {
    const id = String(r[0]);
    if (!id) return true;
    if (seenId[id]) return false;
    seenId[id] = true;
    return true;
  }).map(function (r) {
    return {
      game: String(r[1]),
      sid: String(r[2]),
      time: r[3] instanceof Date ? r[3] : new Date(r[3]),
      type: String(r[4]),
      mission: String(r[5]),
      value: String(r[6]),
    };
  }).filter(function (r) { return r.sid && r.type; });

  rows.sort(function (a, b) { return a.time - b.time; });

  const out = [];
  const push = function () { out.push(Array.prototype.slice.call(arguments)); };

  // 資料新鮮度。手動重算的報表，沒有這一行就會被當成最新的
  push('資料截至', fmtTime_(rows[rows.length - 1].time), '共 ' + rows.length + ' 列',
       '（重算於 ' + fmtTime_(new Date()) + '）');
  push('');

  // ---- 場次：把資料切成幾段各自算 ----
  //
  // 沒設定場次時 sessions 是空陣列，走的是跟以前一模一樣的那條路（全部一段），
  // 既有的試算表不會看到任何差別。
  const sessions = readSessions_(ss);

  if (sessions.length === 0) {
    reportSlice_(push, rows);
  } else {
    // 先把設定攤在最上面。**時間段不能是藏起來的狀態**——否則你看著一張報表，
    // 不知道它算的是哪一段（同「資料截至」那一行要防的錯）。
    push('場次設定');
    push('場次', '開始（含）', '結束（不含）', '筆數');
    const buckets = sessions.map(function (sn) {
      const evs = rows.filter(function (r) { return inSession_(r, sn); });
      push(sn.name, sn.from ? fmtTime_(sn.from) : '—', sn.to ? fmtTime_(sn.to) : '—', evs.length);
      return { name: sn.name, evs: evs };
    });

    // **不在任何場次裡的資料自成一段，不丟掉。**
    // 篩掉的資料不會有人發現——這跟去重那邊「少一列資料看不出來」是同一個判斷。
    const rest = rows.filter(function (r) {
      return !sessions.some(function (sn) { return inSession_(r, sn); });
    });
    if (rest.length) push('（不在任何場次內）', '—', '—', rest.length);
    push('');

    buckets.forEach(function (b) {
      push('════════ 場次：' + b.name + ' ════════');
      push('');
      if (b.evs.length === 0) {
        push('（這個時間段裡沒有資料）');
      } else {
        reportSlice_(push, b.evs);
      }
      push('');
    });

    if (rest.length) {
      push('════════ 不在任何場次內 ════════');
      push('');
      reportSlice_(push, rest);
      push('');
    }
  }

  const report = ss.getSheetByName(REPORT_NAME) || ss.insertSheet(REPORT_NAME);
  report.clear();
  const width = out.reduce(function (w, r) { return Math.max(w, r.length); }, 1);
  const padded = out.map(function (r) {
    const c = r.slice();
    while (c.length < width) c.push('');
    return c;
  });
  // **格式要在寫值之前設。** 設在後面沒有用——值已經被轉成數字才去改格式，
  // 那一格存的就已經是 7 了，改格式只是換一種方式顯示 7。
  // 關卡名稱靠這一行才會保持 "007" 而不是 7。
  report.getRange('A:A').setNumberFormat('@');
  report.getRange(1, 1, padded.length, width).setValues(padded);

  padded.forEach(function (r, i) {
    if (r[0] === '整場' || r[0] === '每一關' || r[0] === '最常見的錯誤答案' ||
        r[0] === '資料截至' || r[0] === '關卡' || r[0] === '資料來源' ||
        r[0] === '遊戲' || String(r[0]).indexOf('━') === 0) {
      report.getRange(i + 1, 1, 1, width).setFontWeight('bold');
    }
  });

  // 欄寬自己量，不呼叫 autoResize。
  //
  // 那支 API 在這張表上量不準——第一欄的「全程花費（中位數）」一直被切掉，
  // 補了 flush（寫值之後、調整之後各一次）也一樣。我不想再猜它為什麼，
  // 而寫死一個下限只會在下一份資料、下一組標題時再壞一次
  // （Dong：「定一個數字之後一定也會有問題」）。
  //
  // 改成從內容算：中日韓字元佔兩個半形位，每個半形位約 CH_PX，再加左右內距。
  // **常數是「一個字多寬」（字型的性質），不是「某一欄多寬」（內容的性質）**
  // ——所以標題變長、關卡改名、多一種事件都會自己跟著調整。
  //
  // 這裡不需要 flush：全部都是寫入，沒有讀回任何東西——而先前那兩個坑
  // （autoResize 讀到還沒寫進去的內容、getColumnWidth 讀到還沒生效的寬度）
  // 都是「寫完馬上讀」造成的。不讀就沒有那個問題。
  for (var c = 0; c < width; c++) {
    var cells = 0;
    for (var r = 0; r < padded.length; r++) {
      cells = Math.max(cells, textCells_(padded[r][c]));
    }
    report.setColumnWidth(c + 1, Math.max(MIN_COL_PX, cells * CH_PX + PAD_PX));
  }

  ss.setActiveSheet(report);
}

// 一款遊戲的報表內容。抽出來是因為現在同一張表裡可能有好幾款遊戲的資料，
// 而每一款都要各算一次——共用同一份計算，不要讓其中一款的數字有自己的算法。
// 一段資料（可能是全部，也可能是某一個場次）的完整報表：
// 先列出裡面有哪些遊戲，再每款各出一份。
function reportSlice_(push, rows) {
  // ---- 資料來源：這張表裡有哪些遊戲的資料 ----
  //
  // **為什麼不是一個「選哪一款」的下拉選單。** 選單只解決「我有多款遊戲」，
  // 不解決「有人亂填」——而且它會製造一個藏起來的狀態：你看著一張報表，
  // 但不知道它現在顯示的是哪一款。那跟上面那行「資料截至」要防的是同一種錯。
  //
  // 攤開來的話，**污染變成看得見的**：亂填的資料自己成一段，掃一眼就知道
  // 有沒有髒東西進來，而不是被靜靜地平均掉。這張小表本身就是異常偵測——
  // 筆數、時間範圍不對勁的一眼就浮出來。
  //
  // ⚠️ 但這擋不住「用你自己的 gameId 送假資料」：recordUrl 與 gameId 都寫在
  // 玩家打得開的 config.csv 裡。分組只能隔開不同的遊戲，不能隔開假裝是你的遊戲。
  const byGame = groupBy_(rows, 'game');
  const games = Object.keys(byGame).sort(function (a, b) {
    return byGame[b].length - byGame[a].length;
  });

  push('資料來源');
  push('遊戲', '筆數', '第一筆', '最後一筆');
  games.forEach(function (g) {
    const evs = byGame[g];
    push(g || '（沒有遊戲名稱）', evs.length,
         fmtTime_(evs[0].time), fmtTime_(evs[evs.length - 1].time));
  });
  push('');

  games.forEach(function (g) {
    push('━━━ ' + (g || '（沒有遊戲名稱）') + ' ━━━');
    push('');
    reportOneGame_(push, byGame[g]);
    push('');
  });

}

function reportOneGame_(push, rows) {
  // 「組」不是「人」：同一支手機重新開始算兩組，一群人共用一支手機算一組
  const bySid = groupBy_(rows, 'sid');
  const sids = Object.keys(bySid);
  const finished = sids.filter(function (s) { return has_(bySid[s], 'game_end'); });
  const totalMins = finished.map(function (s) {
    return minutes_(first_(bySid[s], 'game_start') || bySid[s][0], last_(bySid[s], 'game_end'));
  }).filter(isNum_);

  push('整場');
  push('開始遊玩', sids.length + ' 組');
  push('完賽', finished.length + ' 組',
       sids.length ? pct_(finished.length / sids.length) : '');
  push('全程花費（中位數）', med_(totalMins) === null ? '—' : med_(totalMins) + ' 分',
       finished.length ? '' : '（還沒有人完賽）');
  push('');

  // 關卡的排序用「第一次有人進到這關」的時間，那就是實際的遊玩順序
  const order = {};
  rows.forEach(function (r) {
    if (r.type === 'mission_start' && r.mission && !(r.mission in order)) {
      order[r.mission] = r.time.getTime();
    }
  });
  const missions = Object.keys(order).sort(function (a, b) { return order[a] - order[b]; });

  if (missions.length === 0) {
    push('每一關', '（還沒有人進到任何一關）');
    return;
  }

  push('每一關');
  // 「主動看提示」與「自動解鎖」**要分開兩欄，不能相加**。
  // 前者是玩家自己按了確認鈕——他承認需要幫忙，是卡關最直接的證據；
  // 後者是時間到、安全網開的，所有在這一關待夠久又打開過提示頁的人都會觸發，
  // 不管他需不需要。加在一起會系統性地高估卡關，而且數字看起來完全正常。
  push('關卡', '進來', '通過', '通過率', '花費中位數（分）', '主動看提示', '自動解鎖', '答錯', '放棄');
  missions.forEach(function (m) {
    const inSids = distinct_(rows.filter(function (r) {
      return r.type === 'mission_start' && r.mission === m;
    }).map(function (r) { return r.sid; }));
    const passSids = distinct_(rows.filter(function (r) {
      return r.type === 'answer_right' && r.mission === m;
    }).map(function (r) { return r.sid; }));

    const spent = inSids.map(function (s) {
      const evs = bySid[s];
      const start = first_(evs, 'mission_start', m);
      if (!start) return null;
      const right = evs.filter(function (r) {
        return r.type === 'answer_right' && r.mission === m && r.time >= start.time;
      })[0];
      return right ? minutes_(start, right) : null;
    }).filter(isNum_);

    push(
      m,
      inSids.length,
      passSids.length,
      inSids.length ? pct_(passSids.length / inSids.length) : '',
      // 沒有作答的關卡（純劇情）算不出時間，留 — 比填 0 誠實
      med_(spent) === null ? '—' : med_(spent),
      count_(rows, 'hint_unlock', m),
      count_(rows, 'hint_auto_unlock', m),
      count_(rows, 'answer_wrong', m),
      count_(rows, 'give_up', m)
    );
  });
  push('');

  // 這一塊對出題的人最有價值：它是「你以為的答案」與「玩家以為的答案」的差距，
  // 也是改題目唯一的依據
  const wrong = {};
  rows.filter(function (r) { return r.type === 'answer_wrong' && r.value; })
    .forEach(function (r) {
      // 用 JSON 當 key，不要自己挑分隔字元——玩家的答案裡可能有任何東西
      const k = JSON.stringify([r.mission, r.value]);
      wrong[k] = (wrong[k] || 0) + 1;
    });
  const top = Object.keys(wrong)
    .sort(function (a, b) { return wrong[b] - wrong[a]; })
    .slice(0, 10);

  push('最常見的錯誤答案');
  if (top.length === 0) {
    push('（還沒有人答錯）');
  } else {
    push('關卡', '玩家打了什麼', '次數');
    top.forEach(function (k) {
      const p = JSON.parse(k);
      push(p[0], p[1], wrong[k]);
    });
  }
}

// ======================== 小工具 ========================

// 一個半形字元的寬度，以及儲存格左右的內距。這兩個是**字型**的性質，
// 不隨內容改變——所以它們是常數是合理的，寫死某一欄多寬則不是。
const CH_PX = 7;
const PAD_PX = 24;
const MIN_COL_PX = 60;

// 這段文字佔幾個半形位。中日韓字元（含全形標點）算兩個。
function textCells_(v) {
  const s = String(v === null || v === undefined ? '' : v);
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n += s.charCodeAt(i) > 0x2e80 ? 2 : 1;
  }
  return n;
}

function groupBy_(arr, key) {
  const out = {};
  arr.forEach(function (x) { (out[x[key]] = out[x[key]] || []).push(x); });
  return out;
}
function distinct_(arr) {
  const seen = {}, out = [];
  arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
  return out;
}
function has_(evs, type) {
  return evs.some(function (e) { return e.type === type; });
}
function first_(evs, type, mission) {
  return evs.filter(function (e) {
    return e.type === type && (mission === undefined || e.mission === mission);
  })[0] || null;
}
function last_(evs, type) {
  const f = evs.filter(function (e) { return e.type === type; });
  return f.length ? f[f.length - 1] : null;
}
function count_(rows, type, mission) {
  return rows.filter(function (r) { return r.type === type && r.mission === mission; }).length;
}
function minutes_(a, b) {
  if (!a || !b) return null;
  return Math.round(((b.time - a.time) / 60000) * 10) / 10;
}
function isNum_(x) { return typeof x === 'number' && isFinite(x); }
// 中位數不是平均。實境遊戲會有人把手機放著去吃飯，一個離群值就毀掉平均
function med_(arr) {
  if (!arr.length) return null;
  const a = arr.slice().sort(function (x, y) { return x - y; });
  const m = Math.floor(a.length / 2);
  const v = a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  return Math.round(v * 10) / 10;
}
function pct_(x) { return Math.round(x * 100) + '%'; }
function fmtTime_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}
