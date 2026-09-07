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
const HEADER = ['事件 id', '遊戲', '這局玩家', '時間', '事件', '關卡', '內容 (v3)'];

// ======================== 收資料 ========================

function doPost(e) {
  // 50 個人可能同時送。沒有鎖的話，兩筆會搶同一列、蓋掉彼此
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getLogSheet_();

    const data = JSON.parse(e.postData.contents);
    const events = data.events || [];

    // 靠事件 id 去重：補送、重試都不會變成第二筆
    const seen = {};
    const last = sheet.getLastRow();
    if (last > 1) {
      sheet.getRange(2, 1, last - 1, 1).getValues()
        .forEach(function (r) { seen[r[0]] = true; });
    }

    const rows = events
      .filter(function (ev) { return ev && ev.id && !seen[ev.id]; })
      .map(function (ev) {
        return [ev.id, data.gameId || '', data.sid || '', new Date(ev.ts),
                ev.type || '', ev.missionId || '', ev.value || ''];
      });

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADER.length)
        .setValues(rows);
    }
    return ContentService.createTextOutput('ok ' + rows.length);
  } finally {
    lock.releaseLock();
  }
}

function getLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
  // 每次都設，不只在建立分頁時設。創作者會刪分頁、改名、手動貼東西，
  // 任何依賴「第一次」的邏輯遲早會失效。
  //   D 欄：預設格式只顯示日期，而「每關花多久」全靠時分秒
  //   其餘：試算表會把 "007" 變成 7、把 "1-2" 變成日期
  sheet.getRange('D:D').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange('A:C').setNumberFormat('@');
  sheet.getRange('F:G').setNumberFormat('@');
  return sheet;
}

// ======================== 報表 ========================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('謎生')
    .addItem('重算報表', 'rebuildReport')
    .addToUi();
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

  const values = log.getRange(2, 1, log.getLastRow() - 1, HEADER.length).getValues();
  const rows = values.map(function (r) {
    return {
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

  push('每一關');
  push('關卡', '進來', '通過', '通過率', '花費中位數（分）', '解提示', '答錯', '放棄');
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
        r[0] === '資料截至' || r[0] === '關卡') {
      report.getRange(i + 1, 1, 1, width).setFontWeight('bold');
    }
  });

  // **先 flush 再量寬度。** 沒有 flush 的話 autoResize 是照「還沒寫進去的內容」
  // 去算的，結果就是標題被截掉（實測「花費中位數（分）」只剩「花費中位」）。
  SpreadsheetApp.flush();
  report.autoResizeColumns(1, width);
  // autoResize 貼著字切齊，中文標題看起來會很擠——每欄補一點餘裕。
  // 第一欄另外給一個下限：autoResize 對它量不準（實測「全程花費（中位數）」
  // 仍然被切成「全程花費（中」），而那一欄裝的全是最長的那種說明文字。
  for (var c = 1; c <= width; c++) {
    var w = report.getColumnWidth(c) + 18;
    report.setColumnWidth(c, c === 1 ? Math.max(w, 190) : w);
  }
  ss.setActiveSheet(report);
}

// ======================== 小工具 ========================

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
