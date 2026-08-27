import { useEffect } from 'react';

// 用 ← → 走流程。
//
// 前進只在「按一下就走」的頁面開。Quiz 要選分支、兩種輸入頁要打字，
// 那些頁面一律不攔 →——「按了沒反應」與「按了會作弊」是兩種都不想要的困惑，
// 不攔就只剩前者，而且是使用者一看畫面就懂的那一種。
const FORWARD_MODELS = new Set(['Talk', 'Img', 'MissionStart']);

// 焦點在會吃方向鍵的東西上時要整個放行——輸入框裡，← → 是移動游標
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
// 「確定送出？」還開在畫面上，背後的流程已經被 ← 退掉兩列了。
//
// 而且對話框是 modal：它開著就代表這一刻的操作對象是它，背景本來就不該收鍵盤。
const hasOpenDialog = () =>
  !!document.querySelector('[role="dialog"], [role="alertdialog"]');

// 掛在 GameController 裡（而不是 GameShell）是刻意的：GameController 只有在底部
// 分頁停在「解謎」時才 mount，於是切到道具／提示頁時鍵盤自然就不會讓流程前進，
// 不必再自己判斷「現在在哪一頁」。
const useFlowKeys = ({
  model,
  onNext,
  canProceed,
  goBack,
  canGoBack,
  allowBack = false,
}) => {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      // 帶修飾鍵的方向鍵是瀏覽器／作業系統的（上一頁、切桌面…），不要搶
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (isTypingTarget(document.activeElement)) return;
      if (hasOpenDialog()) return;

      if (event.key === 'ArrowRight') {
        if (!canProceed || !FORWARD_MODELS.has(model)) return;
        event.preventDefault();
        onNext();
        return;
      }

      // ← 是導覽，不是作答：任何 model 都能退，包括 Quiz 與輸入頁——
      // 「選錯了想回去重選」正是驗流程時最常做的事
      if (!allowBack || !canGoBack) return;
      event.preventDefault();
      goBack();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [model, onNext, canProceed, goBack, canGoBack, allowBack]);
};

export default useFlowKeys;
