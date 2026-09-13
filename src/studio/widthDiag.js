import { diagEnabled, setDiagTab } from '../shared/diagBus';

// 版面量測：誰把畫面撐寬了。送進 DiagDock 當一個分頁（`?diag=1`）。
//
// **為什麼是純 JS 不是 React 元件。** 要抓的東西出現在**載入的那幾秒**
// （Dong 2026-09-13 的 Android 截圖：骨架只佔 86%，右側多出一條黑帶），而那段期間
// CreateApp 還在 LoadingScreen 那個分支上——掛成元件就得處理每一個 render 分支，
// 而且掛得比 loading 晚就什麼都量不到。從入口直接注入，它比 React 先開始看。
//
// 面板（DiagDock）掛在 GameShell 裡，載入時還不存在，但**沒關係**：
// 讀數先進 bus 存著，而且「最糟的一次」會被記住，面板出現後照樣看得到。
//
// **為什麼要做這個工具而不是繼續看 CSS。** 當時我已經對那個 bug 猜錯兩次：
// 先猜是那行載入文字沒有 maxWidth（補了 `left` 之後黑帶還在），再從 CSS 推理時
// 繞出兩個互相矛盾的假設。推理連續失效兩次，該換成量——
// 而量出來的「溢出 0px」正是把方向翻過來的那一筆：**不是有東西太寬，是骨架太窄。**

const MAX_ROWS = 5;

// 溢出是會消失的（載入結束、版面重排），所以要記住「曾經最糟的那一次」，
// 不能只顯示當下——不然等使用者看到面板時，兇手可能已經不見了。
let worst = { over: 0, at: '', rows: [] };

const describe = (el) => {
  const cls = (el.className?.baseVal ?? el.className ?? '').toString().trim();
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return [
    el.tagName.toLowerCase(),
    cls ? `.${cls.split(/\s+/).slice(0, 2).join('.')}` : '',
    text ? ` 「${text.slice(0, 14)}」` : '',
  ].join('');
};

const scan = () => {
  // clientWidth＝不含捲軸的版面寬，也就是「東西應該待在裡面」的那個框
  const vw = document.documentElement.clientWidth;
  const rows = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const over = Math.round(r.right - vw);
    if (over > 1) {
      rows.push({
        over,
        // position 一起印：fixed 的東西照理不該撐寬 document，
        // 兇手如果是 fixed，那就是另一個故事
        pos: getComputedStyle(el).position,
        width: Math.round(r.width),
        what: describe(el),
      });
    }
  }
  rows.sort((a, b) => b.over - a.over);
  return rows.slice(0, MAX_ROWS);
};

const fmt = (list) =>
  list.length
    ? list.map((r) => `  +${r.over}px [${r.pos}] w=${r.width} ${r.what}`).join('\n')
    : '  （沒有元素超出）';

export const startWidthDiag = () => {
  if (!diagEnabled()) return;

  const tick = () => {
    const de = document.documentElement;
    const vw = de.clientWidth;
    const over = de.scrollWidth - vw;
    const rows = scan();

    if (over > worst.over) {
      worst = {
        over,
        at: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        rows,
      };
    }

    setDiagTab('width', {
      title: '版面',
      order: 30,
      // 出過事才佔用收合標籤的位置——沒事的時候它不該跟別的讀數搶注意力
      badge: worst.over > 1 ? `溢出 ${worst.over}px` : '',
      text: [
        `innerWidth=${window.innerWidth} clientWidth=${vw} scrollWidth=${de.scrollWidth}`,
        `現在溢出 ${over}px：`,
        fmt(rows),
        '',
        `最糟的一次 ${worst.over}px（${worst.at || '—'}）：`,
        fmt(worst.rows),
      ].join('\n'),
    });
  };

  tick();
  // 300ms 一次。載入只有幾秒，取樣太疏會整段錯過；這是 dev 工具，效率不是重點。
  // （內容沒變時 setDiagTab 不會驚動面板，見 diagBus——否則使用者會選不起文字。）
  setInterval(tick, 300);
};
