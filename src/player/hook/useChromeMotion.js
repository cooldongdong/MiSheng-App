import { useContext } from 'react';
import { GameContext } from '../store/game-context';

// useChromeMotion.js
// 全螢幕看圖時，「點一下」要收起／叫回的那些介面：縮小鈕、左上品牌標、右上那排
// 按鈕，以及跟著全螢幕一起收的底部導覽列。
//
// **四個角落必須共用同一份動作定義**——分開各寫一次，遲早會有一個沒跟上，
// 那就是「按鈕回來的時間不一樣」（Dong 2026-09-05）。
//
// **進場慢、退場快。** 玩家點畫面是為了「把介面弄走、看清楚圖」，那個意圖要立刻
// 被滿足；叫它回來時慢一點反而顯得穩。等長的一進一出會讓退場拖泥帶水。
// 曲線也分兩種：進場先快後慢（滑進來、停穩），退場持續加速（不必看它慢慢消失）。
// 常數與 hook 跟元件分檔，是因為**同一個檔同時匯出元件與非元件會讓 fast refresh
// 失效**（eslint 會警告）——同 useImageRatio 之於 SkeletonImage。
export const CHROME_ENTER_MS = 240;
export const CHROME_EXIT_MS = 150;
const EASE_ENTER = 'cubic-bezier(0.2, 0.8, 0.2, 1)'; // 帶一點回彈感的減速
const EASE_EXIT = 'cubic-bezier(0.4, 0, 1, 1)';
// 位移幅度。**只要一點點**——這是「東西回到位子上」的暗示，不是一段演出。
const SHIFT_PX = 10;

/**
 * 介面進退場的樣式。**位移一定要下在會動的那個元素自己身上，不能下在外框**——
 * 有 transform 的外框會變成它底下 absolute／fixed 子元素的定位基準，
 * `top: 8` 或 `bottom: 20` 會整個跑掉。
 *
 * @param hidden      現在該不該藏起來
 * @param from        'top' 從上面掉下來 / 'bottom' 從下面浮上來
 * @param base        元素本來就有的 transform（例如置中用的 translateX(-50%)）
 * @param instantExit 退場不做動畫，直接消失
 *
 * **instantExit 是給導覽列用的。** 它不是「點一下」切換的介面，而是「有東西蓋上來
 * 了所以它不該在」——那個消失不該被看見。而放大的背景是瞬間出現的，導覽列慢慢淡
 * 出就會在背景上演一段沒有人需要的動畫（Dong 2026-09-05：「按下放大鍵的時候可以
 * 隱約看到導覽列的隱藏動畫」）。回來時仍然要淡，因為那時它是主角。
 */
export const chromeMotionSx = (
  hidden,
  { from = 'top', base = '', instantExit = false } = {}
) => {
  const shift = from === 'bottom' ? SHIFT_PX : -SHIFT_PX;
  const ms = hidden ? (instantExit ? 0 : CHROME_EXIT_MS) : CHROME_ENTER_MS;
  const ease = hidden ? EASE_EXIT : EASE_ENTER;
  return {
    opacity: hidden ? 0 : 1,
    // 藏起來的時候也要擋掉點擊，否則看不見的按鈕還按得到
    pointerEvents: hidden ? 'none' : 'auto',
    transform: `${base} translateY(${hidden ? shift : 0}px)`.trim(),
    transition: `opacity ${ms}ms ${ease}, transform ${ms}ms ${ease}`,
    // 退場後不要留在合成層上佔記憶體，但進場前要先升好層——不然第一格會頓
    willChange: 'opacity, transform',
  };
};

/** 現在介面該不該藏。分兩種：跟著「點一下」切換的，與跟著全螢幕開關的。 */
export const useChromeHidden = () => {
  const { overlayOpen, overlayChromeVisible } = useContext(GameContext);
  return {
    overlayOpen: Boolean(overlayOpen),
    chromeHidden: Boolean(overlayOpen) && !overlayChromeVisible,
  };
};
