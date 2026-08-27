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

const useFlowKeys = ({
  canAdvance = false,
  onNext,
  goBack,
  canGoBack = false,
  devTools = false,
  optionCount = 0,
  onPickOption = null,
}) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      // 帶修飾鍵的是瀏覽器／作業系統的（上一頁、切桌面…），不要搶
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      // Esc 把游標從輸入框放出來。作答頁的輸入框會自動 focus，游標在裡面時
      // 上下鍵是移動游標——沒有這個出口，作答頁就變成鍵盤的死路。
      if (event.key === 'Escape') {
        if (isTypingTarget(document.activeElement)) {
          event.preventDefault();
          document.activeElement.blur();
        }
        return;
      }

      if (isTypingTarget(document.activeElement)) return;
      if (hasOpenDialog()) return;

      // Quiz 的選項按數字。不佔方向鍵，而且「按 1、退回、按 2」是驗分支時
      // 真正在做的事——比用高亮一格一格移過去快。
      if (devTools && onPickOption && optionCount > 0 && /^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (index >= optionCount) return;
        event.preventDefault();
        onPickOption(index);
        return;
      }

      if (event.key === 'ArrowDown') {
        if (!canAdvance) return;
        event.preventDefault();
        onNext();
        return;
      }

      if (event.key === 'ArrowUp') {
        // 回上一頁是開發工具（它不會把狀態倒回來），只在 /create 開
        if (!devTools || !canGoBack) return;
        event.preventDefault();
        goBack();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canAdvance, onNext, goBack, canGoBack, devTools, optionCount, onPickOption]);
};

export default useFlowKeys;
