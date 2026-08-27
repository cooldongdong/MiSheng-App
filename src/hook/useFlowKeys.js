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

// 這個鍵是不是「我們本來就想處理」的——只有這些才印診斷，不然使用者打字會洗版
const isWatchedKey = (key) =>
  key === 'ArrowUp' || key === 'ArrowDown' || key === 'Escape' || /^[1-9]$/.test(key);

// 診斷（暫時性，等鍵盤的行為定案就收掉）。
//
// 這幾個鍵一律印，不看 devTools、不看入口、不看焦點在哪。前兩版分別綁過 devTools
// 與 ?keylog=1，結果每一次「看不到 log」都同時有兩種解釋——是這條路沒走到，還是
// log 自己被關著？兩個未知數擺在一起就查不下去了。
//
// 所以現在只剩一個變因：按了 ↑ ↓ Esc 或數字而 console 一片安靜，就只可能是
// 這個頁面跑的不是這份程式碼（舊 bundle、別的 port、線上版）。
const keylogForced = () => true;

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
  canAdvance = false,
  onNext,
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
    if (!devTools && !keylogForced()) return;
    console.log(
      `[misheng 鍵盤] 已接上 | 入口=${window.location.pathname}` +
        ` devTools=${devTools}（數字鍵與回上一頁只在 devTools=true 時作用）`
    );
  }, [devTools]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const watched = isWatchedKey(event.key);
      const log = (verdict) => {
        if (watched && (devTools || keylogForced())) {
          console.log(
            `[misheng 鍵盤] 按下 ${event.key} → ${verdict}` +
              ` | 目前：model=${model} 可前進=${canAdvance} 選項=${optionCount}` +
              ` 有上一頁=${canGoBack} 焦點=${describeTarget(document.activeElement)}`
          );
        }
      };

      // 帶修飾鍵的方向鍵是瀏覽器／作業系統的（上一頁、切桌面…），不要搶
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        log('不處理：同時按著 Cmd / Ctrl / Alt / Shift');
        return;
      }

      // Esc 把游標從輸入框放出來。作答頁的輸入框會自動 focus，游標在裡面時
      // 上下鍵是移動游標——沒有這個出口，作答頁就變成鍵盤的死路。
      if (event.key === 'Escape') {
        if (isTypingTarget(document.activeElement)) {
          event.preventDefault();
          document.activeElement.blur();
          log('放掉輸入框的焦點');
        } else {
          log('不處理：焦點本來就不在輸入框裡');
        }
        return;
      }

      if (isTypingTarget(document.activeElement)) {
        log('不處理：游標在輸入框裡，這一下是打字（按 Esc 可以放掉焦點）');
        return;
      }
      if (hasOpenDialog()) {
        log('不處理：畫面上有對話框開著');
        return;
      }

      // Quiz 的選項按數字。不佔方向鍵，而且「按 1、退回、按 2」是驗分支時
      // 真正在做的事——比用高亮一格一格移過去快。
      if (/^[1-9]$/.test(event.key)) {
        if (!devTools) {
          log('不處理：數字鍵只在 /create 開');
          return;
        }
        if (!onPickOption || optionCount === 0) {
          log('不處理：這一頁沒有選項（數字鍵只在 Quiz 那一頁作用）');
          return;
        }
        const index = Number(event.key) - 1;
        if (index >= optionCount) {
          log(`不處理：這一頁只有 ${optionCount} 個選項`);
          return;
        }
        event.preventDefault();
        log(`選第 ${index + 1} 個選項`);
        onPickOption(index);
        return;
      }

      if (event.key === 'ArrowDown') {
        if (!canAdvance) {
          log(`不處理：這一頁不能用鍵盤前進（model=${model}）`);
          return;
        }
        event.preventDefault();
        log('前進到下一列');
        onNext();
        return;
      }

      if (event.key === 'ArrowUp') {
        // 回上一頁是開發工具（它不會把狀態倒回來），只在 /create 開
        if (!devTools) {
          log('不處理：回上一頁只在 /create 開');
          return;
        }
        if (!canGoBack) {
          log('不處理：沒有上一頁了（這一次試玩還沒走過任何一步）');
          return;
        }
        event.preventDefault();
        log('回到上一頁');
        goBack();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    canAdvance,
    onNext,
    goBack,
    canGoBack,
    devTools,
    optionCount,
    onPickOption,
    model,
  ]);
};

export default useFlowKeys;
