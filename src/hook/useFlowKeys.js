import { useEffect } from 'react';

// 用鍵盤走流程。
//
// 方向是上下不是左右：/create 的流程圖由上往下排，遊戲欄本身也是手機直式、往下讀，
// 所以 ↓ 前進、↑ 回上一頁跟眼睛看到的方向一致。左右鍵不接——兩組都收看似無害，
// 但「這個鍵到底會做什麼」多一種說法就多一次要猜。
//
// 哪一頁能前進由呼叫端決定（canAdvance）：那件事要看 model，也要看關卡答對了沒，
// 是遊戲的事，不是鍵盤的事。
//
// 掛在 GameController 裡（而不是 GameShell）是刻意的：GameController 只有在底部
// 分頁停在「解謎」時才 mount，於是切到道具／提示頁時鍵盤自然就不會讓流程前進，
// 不必再自己判斷「現在在哪一頁」。
const isTypingTarget = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!el.isContentEditable;
};

// 有對話框開著就整個放行。
//
// 判準是「畫面上有沒有開著的對話框」，不是「焦點在不在對話框裡」——實測 MUI 的
// Dialog 一開，document.activeElement 是它那層 tabindex="-1" 的 div，而 role="dialog"
// 掛在更裡面的 Paper 上，於是 closest('[role=dialog]') 一律是 false。照那樣寫，
// 「確定送出？」還開在畫面上，背後的流程已經被上一頁鍵退掉兩列了。
//
// 而且對話框是 modal：它開著就代表這一刻的操作對象是它，背景本來就不該收鍵盤。
const hasOpenDialog = () =>
  !!document.querySelector('[role="dialog"], [role="alertdialog"]');

// 一律看 event.code（實體鍵位），不看 event.key。
//
// 中文輸入法在中文模式下會先吃掉數字鍵——那是它的選字鍵——於是瀏覽器送出的
// event.key 是 'Process'（keyCode 229），不是 '1'。比對 key 的話，那一下對程式來說
// 根本不叫「按下 1」：不處理，連 log 都不會印。實證：Dong 按著中英切換鍵時才印得出
// log，放開就一片安靜，而方向鍵始終正常（沒組字時 IME 不攔方向鍵）——落差就是這樣來的。
//
// event.code 是鍵盤上的位置，跟輸入法、跟鍵盤佈局都無關。這個專案的使用者全是中文
// 使用者，所以這不是邊緣情況，是主要路徑。
const KEY_UP = 'ArrowUp';
const KEY_DOWN = 'ArrowDown';
const KEY_LEFT = 'ArrowLeft';
const KEY_RIGHT = 'ArrowRight';

// 地圖模式下四個方向鍵對應的走法
const DIRECTIONS = {
  [KEY_UP]: 'up',
  [KEY_DOWN]: 'down',
  [KEY_LEFT]: 'left',
  [KEY_RIGHT]: 'right',
};
const KEY_ESC = 'Escape';
const KEY_BACK = 'Backspace';

// code 優先，沒有才退回 key。
//
// 真實鍵盤一定帶 code，所以 IME 那條路永遠走得到上面說的修正。少數合成事件不帶
// （自動化工具、部分無障礙軟體就是這樣送的），那時 key 是唯一的線索——而那種來源
// 本來就沒有輸入法介入的問題，退回去是安全的。
const codeOf = (event) => event.code || event.key;

// 主鍵盤與數字鍵盤的 1-9 都算；沒有 code 時的裸 '1' 也算
const digitOf = (code) => {
  const matched = /^(?:Digit|Numpad)?([1-9])$/.exec(code || '');
  return matched ? Number(matched[1]) : null;
};

const isWatchedKey = (code) =>
  code === KEY_UP ||
  code === KEY_DOWN ||
  code === KEY_LEFT ||
  code === KEY_RIGHT ||
  code === KEY_ESC ||
  code === KEY_BACK ||
  digitOf(code) !== null;

// 診斷：網址加 ?keylog=1 打開，會逐鍵印出「這一下走到哪、為什麼停」。
//
// 留著這條路而不是刪掉，是因為「按了沒反應」有太多長得一樣的成因，而且**有一大半
// 不在這份程式碼裡**。2026-08-27 查過一輪，最後的兇手是 Vimium 擴充套件：它把數字
// 當成重複次數的前綴（3j ＝ 往下捲三次），在 document_start 就註冊捕獲期 listener
// 並 stopImmediatePropagation，比 React 早，網頁這邊沒有能贏的招。
//
// 那次的三個症狀值得記下來，因為它們是這類問題的指紋：
//   ① 只有數字失效，方向鍵正常——擴充只綁了裸數字
//   ② 只有作答頁有反應——游標在輸入框裡時它切到 insert mode 放行
//   ③ 按著修飾鍵就正常——不再符合它的裸鍵規則
// 換一個瀏覽器就好、或改用 file:// 開就好（擴充預設不注入 file://），也都指向擴充。
const keylogForced = () => {
  try {
    return new URLSearchParams(window.location.search).get('keylog') === '1';
  } catch {
    return false;
  }
};

// 按了沒反應的時候，畫面上看不出是哪一關卡住的：焦點在別的地方？這一頁不能前進？
// 還是根本沒開？所以每一次「我們想處理的鍵」都在 console 交代自己走到哪、為什麼停。
// 只在 /create（devTools）印。
const describeTarget = (el) => {
  if (!el) return '（沒有焦點）';
  const bits = [el.tagName];
  if (el.id) bits.push(`#${el.id}`);
  if (el.placeholder) bits.push(`placeholder="${el.placeholder}"`);
  return bits.join(' ');
};

const useFlowKeys = ({
  mapMode = false,
  onMove = null,
  canAdvance = false,
  onNext,
  onPrev,
  canGoPrev = false,
  goBack,
  canGoBack = false,
  devTools = false,
  optionCount = 0,
  onPickOption = null,
  model = null,
}) => {
  // 掛載時先報一次到。這一行才是真正能結案的證據：印得出來＝鍵盤確實接上了、
  // 而且看得到這一頁是哪個入口、devTools 是不是真的。印不出來＝這個頁面跑的
  // 根本不是這份程式碼（舊的 bundle、別的 port、線上版）。
  useEffect(() => {
    if (!keylogForced()) return;
    console.log(
      `[misheng 鍵盤] 已接上 | 入口=${window.location.pathname}` +
        ` devTools=${devTools}（數字鍵與回上一頁只在 devTools=true 時作用）`
    );
  }, [devTools]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const code = codeOf(event);
      const watched = isWatchedKey(code);
      const log = (verdict) => {
        if (watched && keylogForced()) {
          console.log(
            `[misheng 鍵盤] 按下 ${code}（key=${event.key}）→ ${verdict}` +
              ` | 目前：model=${model} 可前進=${canAdvance} 選項=${optionCount}` +
              ` 有上一頁=${canGoBack} 焦點=${describeTarget(document.activeElement)}`
          );
        }
      };

      // 輸入法正在組字：這一下屬於輸入法（選字、移動候選字），不能搶
      if (event.isComposing || event.keyCode === 229) {
        log('不處理：輸入法正在組字');
        return;
      }

      // 帶修飾鍵的方向鍵是瀏覽器／作業系統的（上一頁、切桌面…），不要搶
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        log('不處理：同時按著 Cmd / Ctrl / Alt / Shift');
        return;
      }

      // Esc 把游標從輸入框放出來。輸入框不再自動 focus 了（2026-08-28），所以這不再是
      // 「一進來就卡住」，但只要使用者點過那個框，上下鍵就變成移動游標——出口還是要留，
      // 否則點過一次之後鍵盤就再也翻不了頁。
      if (code === KEY_ESC) {
        if (isTypingTarget(document.activeElement)) {
          event.preventDefault();
          document.activeElement.blur();
          log('放掉輸入框的焦點');
        } else {
          log('不處理：焦點本來就不在輸入框裡');
        }
        return;
      }

      // 對話框開著時連地圖模式也不搶：它是 modal，這一刻的操作對象就是它。
      // （不擋的話會出現「確定送出？」還開著、背後的流程已經跳走的畫面。）
      if (hasOpenDialog()) {
        log('不處理：畫面上有對話框開著');
        return;
      }

      // 地圖模式：方向鍵屬於圖，優先權高於一切——Quiz 攔不住它，輸入框也攔不住。
      // 這是刻意的（Dong 2026-08-27）：它不是「有時候這樣有時候那樣」，而是一個
      // 明確的「現在方向鍵是拿來走圖的」模式，所以使用者不必猜這一下會做什麼。
      // 代價是這個模式下方向鍵不能在輸入框裡移動游標——打字本身不受影響。
      const direction = mapMode && onMove ? DIRECTIONS[code] : null;
      if (direction) {
        event.preventDefault();
        const moved = onMove(direction);
        const where = { up: '上', down: '下', left: '左', right: '右' }[direction];
        log(
          moved === false
            ? `地圖模式：圖上這一顆的${where}邊沒有東西`
            : `地圖模式：往${where}走`
        );
        return;
      }

      // 流程模式下左右鍵沒有作用——它們是地圖模式的鍵。講出來，不然按了沒反應
      // 又要猜是壞了還是沒開。
      if (code === KEY_LEFT || code === KEY_RIGHT) {
        log('不處理：左右鍵只在地圖模式作用（工具列那顆四向箭頭可以切換）');
        return;
      }

      if (isTypingTarget(document.activeElement)) {
        log('不處理：游標在輸入框裡，這一下是打字（按 Esc 可以放掉焦點）');
        return;
      }

      // Quiz 的選項按數字。不佔方向鍵，而且「按 1、退回、按 2」是驗分支時
      // 真正在做的事——比用高亮一格一格移過去快。
      const digit = digitOf(code);
      if (digit !== null) {
        if (!devTools) {
          log('不處理：數字鍵只在 /create 開');
          return;
        }
        if (!onPickOption || optionCount === 0) {
          log('不處理：這一頁沒有選項（數字鍵只在 Quiz 那一頁作用）');
          return;
        }
        const index = digit - 1;
        if (index >= optionCount) {
          log(`不處理：這一頁只有 ${optionCount} 個選項`);
          return;
        }
        event.preventDefault();
        log(`選第 ${index + 1} 個選項`);
        onPickOption(index);
        return;
      }

      if (code === KEY_DOWN) {
        if (!canAdvance) {
          log(`不處理：這一頁不能用鍵盤前進（model=${model}）`);
          return;
        }
        event.preventDefault();
        log('前進到下一列');
        onNext();
        return;
      }

      // ↑ 走「圖上的上一步」＝流程上會走到這一列的那一列，跟眼睛看到的圖一致。
      // 它不是「回到剛才那一頁」——那是 Backspace。
      if (code === KEY_UP) {
        if (!devTools) {
          log('不處理：上一步只在 /create 開');
          return;
        }
        if (!canGoPrev) {
          log('不處理：圖上這一列前面沒有東西了（只有回頭跳指進來時也算沒有）');
          return;
        }
        event.preventDefault();
        log('走到圖上的上一步');
        onPrev();
        return;
      }

      // Backspace 是「上一步我人在哪」，跟瀏覽器的上一頁同一個意思。
      // 滑鼠跳關之後靠它回得來——↑ 現在照圖走，不再兼這件事。
      if (code === KEY_BACK) {
        if (!devTools) {
          log('不處理：回剛才那一頁只在 /create 開');
          return;
        }
        if (!canGoBack) {
          log('不處理：這一次試玩還沒走過任何一步');
          return;
        }
        // 舊瀏覽器會把 Backspace 當「上一頁」，那會直接離開整個試玩
        event.preventDefault();
        log('回到剛才那一頁');
        goBack();
      }
    };

    // capture 階段：window 的捕獲期是整條路徑的**第一站**，冒泡期是最後一站。
    // 掛在冒泡期的話，中間任何一個元件（MUI 的按鈕、清單、對話框，或瀏覽器擴充
    // 注入的 script）只要 stopPropagation，這裡就完全收不到——而且看起來會跟
    // 「這個鍵沒有作用」一模一樣。
    //
    // 搶在最前面不會弄壞打字：下面第一件事就是檢查焦點在不在輸入框，是的話原封
    // 不動放行。
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    mapMode,
    onMove,
    canAdvance,
    onNext,
    onPrev,
    canGoPrev,
    goBack,
    canGoBack,
    devTools,
    optionCount,
    onPickOption,
    model,
  ]);
};

export default useFlowKeys;
