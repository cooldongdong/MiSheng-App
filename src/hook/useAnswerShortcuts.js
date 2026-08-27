import { useEffect } from 'react';

// 作答頁的兩個快捷鍵，只在 /create 開。
//
// 為什麼是修飾鍵組合、不是數字鍵：作答頁的輸入框會自動接走游標，那裡按下的每一個
// 普通字元都是在打字。要用數字鍵就得先按 Esc 放掉焦點，那就不叫省事了。
// ⌘/Ctrl 的組合在輸入框裡也攔得到，動線才連得起來——走進作答頁、游標已經在框裡、
// 一個鍵過關。
//
// 掛在兩個 input model 裡而不是 GameController：要填什麼、送出什麼是元件自己的
// state（answerArray、userAnswer），從外面拿不到；而且掛在這裡，它的作用範圍
// 天生就等於「現在正停在作答頁」。
export const isMacLike = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

// 按鈕上標的鍵位。Mac 用符號，其他平台寫字——⌘ 對 Windows 使用者不是提示，是謎題。
export const FILL_HINT = () => (isMacLike() ? '⌘⏎' : 'Ctrl+↵');
export const SKIP_HINT = () => (isMacLike() ? '⌘↓' : 'Ctrl+↓');

const useAnswerShortcuts = ({ enabled = false, onFill = null, onSkip = null }) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      // 輸入法正在組字時這一下屬於輸入法
      if (event.isComposing || event.keyCode === 229) return;

      // 只認 ⌘（Mac）或 Ctrl（其他），而且不能同時按著 Alt／Shift——
      // 那些組合多半已經是瀏覽器或輸入法的
      const modifier = isMacLike() ? event.metaKey : event.ctrlKey;
      if (!modifier || event.altKey || event.shiftKey) return;

      // 看實體鍵位而不是 event.key，理由同 useFlowKeys：中文輸入法會改寫 key。
      // 沒有 code 的合成事件退回 key。
      const code = event.code || event.key;
      if ((code === 'Enter' || code === 'NumpadEnter') && onFill) {
        event.preventDefault();
        console.log('[misheng 鍵盤] 填入答案並送出');
        onFill();
        return;
      }

      if (code === 'ArrowDown' && onSkip) {
        event.preventDefault();
        console.log('[misheng 鍵盤] 略過這題');
        onSkip();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onFill, onSkip]);
};

export default useAnswerShortcuts;
