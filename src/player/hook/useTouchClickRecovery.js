import { useEffect } from 'react';

// 補回 Chrome 吞掉的那一次點擊。
//
// ── 證據（2026-09-05，Dong 的 Android Chrome，七輪量測）────────────────────
//
// 症狀：**滑動翻頁之後的第一次點擊沒有作用**，第二次才行。而且：
//   · 按鈕會變色（:active 有生效）⇒ 觸控確實交給了那顆按鈕
//   · touchstart／touchend／pointerdown／pointerup 全都有
//   · **mousedown／mouseup／click 全都沒有** ⇒ 整組相容性滑鼠事件被抑制
//   · 第二次的 mousedown 只慢 13ms ⇒ 不是「等雙擊」的延遲，是直接丟掉
//   · 連掛在遊戲樹外面的按鈕也中招 ⇒ 不是某個元件的問題
//   · 沒人 preventDefault、不在 inert 裡、位移 0px、目標同一顆、主執行緒不忙
//   · 縮放 1.00、無文字選取、文件不可捲
//   · 小幅拖曳不會、按 NEXT 翻頁也不會 ⇒ **滑動 ＋ 換頁**兩者兼具才發生
//   · **Firefox 完全正常** ⇒ 是 Chrome 的手勢判定，不是我們的邏輯
//
// 前後試過而無效的修法：縮短／改寫 click 吞噬窗口、把打字機搬出 model、
// 關掉文字選取、touch-action: manipulation、關掉翻頁動畫。都不是。
//
// ── 作法 ───────────────────────────────────────────────────────────────
//
// 既然瀏覽器不保證生 click，就不要依賴它：**手指沒有移動、卻在 pointerup 之後
// 遲遲等不到 click，就自己補一個。** 判斷完全看行為，不看瀏覽器是誰——正常情況下
// click 會在十幾毫秒內到，補的那一份永遠不會發出去。
//
// 只認觸控（滑鼠與筆不會有這個問題），只認「幾乎沒有移動」的那一下（拖曳本來就
// 不該產生 click），而且元素要還在畫面上。

// 位移超過這麼多就不是點擊，是拖曳
const SLOP_PX = 10;
// 等真的 click 這麼久。實測正常情況約 13ms，80ms 已經很寬鬆
const WAIT_MS = 80;

export const useTouchClickRecovery = () => {
  useEffect(() => {
    let start = null;
    let lastClickAt = 0;

    const onDown = (e) => {
      if (e.pointerType !== 'touch') return;
      start = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };

    const onClick = () => {
      lastClickAt = performance.now();
    };

    const onUp = (e) => {
      const s = start;
      start = null;
      if (!s || e.pointerId !== s.id || e.pointerType !== 'touch') return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > SLOP_PX) return;

      const target = e.target;
      const upAt = performance.now();
      const x = e.clientX;
      const y = e.clientY;

      setTimeout(() => {
        // 瀏覽器自己送來了就什麼都不做——這是絕大多數的情況
        if (lastClickAt > upAt) return;
        if (!(target instanceof Element) || !target.isConnected) return;
        target.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            composed: true,
            clientX: x,
            clientY: y,
            detail: 1,
          })
        );
      }, WAIT_MS);
    };

    const onCancel = () => {
      start = null;
    };

    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      window.removeEventListener('click', onClick, true);
    };
  }, []);
};

export default useTouchClickRecovery;
