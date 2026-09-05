import { useCallback, useEffect, useRef, useState } from 'react';

// 全螢幕圖片的「往下滑關閉」＋「點一下切換介面」。
//
// **為什麼是這兩個手勢**：實境解謎是單手在戶外玩的——右上角的 ✕ 是拇指最難搆到
// 的位置之一，所以關閉鈕留在下方，遮擋改用「點一下把介面收乾淨」解決。而且
// **圖片本身就是謎面**，任何常駐的按鈕都可能蓋到關鍵的那一角。下滑關閉則是
// iPhone 相簿／IG／Twitter 都有的手勢，玩家不用學。
//
// 沿用 useOverlayGestures 檔頭記下的兩個坑：
//   ① **不要 setPointerCapture**——capture 會把後續事件連同 click 一起導向容器，
//      控制列的按鈕就收不到了。拖曳期間改在 window 上聽 move／up。
//   ② **第二根手指一下去就放棄這次拖曳**，把畫面交還給瀏覽器的雙指縮放。
//      index.html 的 viewport 沒有鎖 user-scalable，玩家本來就能放大看細節，
//      不該被我們的單指手勢吃掉。

// 放開時位移超過這麼多就關閉
const DISMISS_PX = 110;
// 或者甩得夠快也算（px/ms）——短距離的快速下滑同樣是「我要關掉」
const DISMISS_VELOCITY = 0.6;
// 位移小於這麼多、而且夠短，就算「點一下」而不是拖曳
const TAP_SLOP = 8;
const TAP_MS = 400;

/**
 * @param onDismiss 判定為「關閉」時呼叫
 * @param onTap     判定為「點一下」時呼叫
 * @returns { dy, dragging, handlers } — dy 給圖片位移用，dragging 用來關掉過場動畫
 */
export const useDismissDrag = ({ onDismiss, onTap }) => {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  // 讓 window 上的監聽拿得到最新的 callback，又不必每次重綁
  const cbs = useRef({ onDismiss, onTap });
  cbs.current = { onDismiss, onTap };

  const stop = useCallback(() => {
    start.current = null;
    setDragging(false);
    setDy(0);
  }, []);

  const onPointerDown = useCallback(
    (event) => {
      // 只認主要按鍵；滑鼠右鍵、筆的側鍵都不是
      if (event.button !== undefined && event.button !== 0) return;
      // 已經在拖了又來第二根手指 ⇒ 這是捏合，整個放棄（見檔頭②）
      if (start.current) {
        start.current = null;
        setDragging(false);
        setDy(0);
        return;
      }
      start.current = {
        x: event.clientX,
        y: event.clientY,
        t: Date.now(),
        moved: false,
      };
      setDragging(true);
    },
    []
  );

  // move／up 掛在 window 上：手指滑出圖片範圍之後還要能繼續跟
  useEffect(() => {
    const onMove = (event) => {
      const s = start.current;
      if (!s) return;
      const dx = event.clientX - s.x;
      const delta = event.clientY - s.y;
      if (Math.abs(dx) > TAP_SLOP || Math.abs(delta) > TAP_SLOP) s.moved = true;
      // 只跟往下的方向。往上不給位移，但仍然算「動過了」——
      // 免得使用者往上滑一段再放開，被誤判成點一下。
      setDy(Math.max(0, delta));
    };

    const onUp = (event) => {
      const s = start.current;
      if (!s) return;
      const elapsed = Date.now() - s.t;
      const delta = Math.max(0, event.clientY - s.y);
      const velocity = elapsed > 0 ? delta / elapsed : 0;

      start.current = null;
      setDragging(false);
      setDy(0);

      if (!s.moved && elapsed < TAP_MS) {
        cbs.current.onTap?.();
        return;
      }
      if (delta > DISMISS_PX || velocity > DISMISS_VELOCITY) {
        cbs.current.onDismiss?.();
      }
      // 沒過門檻：dy 已經歸零，圖片自己彈回去（transition 在元件那邊）
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', stop);
    };
  }, [stop]);

  return { dy, dragging, handlers: { onPointerDown } };
};

export default useDismissDrag;
