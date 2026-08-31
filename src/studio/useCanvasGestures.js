// useCanvasGestures.js
// 白板式的縮放／平移手勢（Heptabase、Miro 那種操作感）。
//
//   滑鼠模式  ：滾輪＝縮放（以游標為圓心）、按住左鍵拖曳＝平移
//   觸控板模式：兩指滑動＝平移、⌘/ctrl＋滾輪或捏合＝縮放
//   觸控螢幕  ：單指拖曳＝平移、兩指捏合＝縮放
//
// 為什麼不用 setPointerCapture：capture 會把後續事件（包含 click）重新導向到
// 容器本身，節點的 onClick 就永遠收不到——「點方塊跳關」會整個失效。
// 改成拖曳期間在 window 上聽 move/up，效果一樣而且不搶走 click。

import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_K = 0.15;
const MAX_K = 2.5;
const clampK = (k) => Math.min(MAX_K, Math.max(MIN_K, k));

// 滑鼠 or 觸控板：這是「偏好」不是「偵測」——兩種慣例都存在，
// 所以跟 Heptabase／Figma 一樣讓使用者自己切，並記在 localStorage
const MODE_KEY = 'misheng_flow_input_mode';
const readMode = () => {
  try {
    return localStorage.getItem(MODE_KEY) || 'mouse';
  } catch {
    return 'mouse';
  }
};

export const useCanvasGestures = () => {
  const boxRef = useRef(null);
  const [t, setT] = useState({ k: 0.6, x: 0, y: 0 });
  const [mode, setMode] = useState(readMode);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const dragged = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const toggleMode = useCallback(() => {
    setMode((m) => {
      const next = m === 'mouse' ? 'trackpad' : 'mouse';
      try {
        localStorage.setItem(MODE_KEY, next);
      } catch {
        /* 無痕模式寫不了就算了 */
      }
      return next;
    });
  }, []);

  const zoomAt = useCallback((cx, cy, factor) => {
    setT((prev) => {
      const k = clampK(prev.k * factor);
      const scale = k / prev.k;
      return { k, x: cx - (cx - prev.x) * scale, y: cy - (cy - prev.y) * scale };
    });
  }, []);

  // 滾輪：要 passive:false 才能 preventDefault，擋掉整頁捲動
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    const onWheel = (e) => {
      e.preventDefault();
      const rect = box.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // macOS 觸控板的捏合會送出 ctrlKey=true 的 wheel，兩指滑動則不會
      const pinchGesture = e.ctrlKey || e.metaKey;
      const zooming = modeRef.current === 'mouse' ? !e.shiftKey : pinchGesture;

      if (zooming) {
        // 觸控板捏合每次只送幾個 delta，倍率要放大很多倍才跟得上手指
        const rate = pinchGesture ? 0.012 : 0.0022;
        zoomAt(cx, cy, Math.exp(-e.deltaY * rate));
      } else {
        setT((p) => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };

    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // 拖曳期間在 window 上聽：滑出畫布外也不會斷，而且不影響節點的 click
  useEffect(() => {
    const onMove = (e) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.current.set(e.pointerId, cur);

      if (pointers.current.size === 2 && pinch.current) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const rect = boxRef.current?.getBoundingClientRect();
        if (!rect) return;
        const factor = dist / (pinch.current.dist || dist);
        const dx = mid.x - pinch.current.mid.x;
        const dy = mid.y - pinch.current.mid.y;

        setT((p) => {
          const k = clampK(p.k * factor);
          const scale = k / p.k;
          const cx = mid.x - rect.left;
          const cy = mid.y - rect.top;
          return {
            k,
            x: cx - (cx - p.x) * scale + dx,
            y: cy - (cy - p.y) * scale + dy,
          };
        });

        pinch.current = { dist, mid };
        dragged.current = true;
        return;
      }

      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged.current = true;
      setT((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
    };

    const onUp = (e) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  };

  // 把某個座標移到畫面中央；可指定縮放
  const centerOn = useCallback((x, y, k) => {
    const box = boxRef.current;
    if (!box) return;
    setT((p) => {
      const nk = k ? clampK(k) : p.k;
      return {
        k: nk,
        x: box.clientWidth / 2 - x * nk,
        // 不要捲到圖的上方去（開頭幾個節點會被推到中間、上面一片空白）
        y: Math.min(16, box.clientHeight / 2 - y * nk),
      };
    });
  }, []);

  const resetView = useCallback((view, k = 0.6) => {
    const box = boxRef.current;
    if (!box || !view?.width) return;
    const cx = view.nodeCenterX ?? view.minX + view.width / 2;
    setT({ k, x: box.clientWidth / 2 - cx * k, y: 16 });
  }, []);

  return {
    boxRef,
    transform: t,
    mode,
    toggleMode,
    zoomAt,
    centerOn,
    resetView,
    wasDragged: () => dragged.current,
    handlers: { onPointerDown },
  };
};
