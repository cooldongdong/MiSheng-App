// useCanvasGestures.js
// 白板式的縮放／平移手勢（Heptabase、Miro 那種操作感）。
//
//   滑鼠：滾輪縮放（以游標為圓心）、按住左鍵拖曳平移
//   觸控：單指拖曳平移、兩指捏合縮放＋移動
//
// 為什麼自己寫不用套件：需要的只有「一個 transform」，而 wheel 要 passive:false
// 才擋得住整頁捲動，用 addEventListener 處理反而比包一層套件單純。

import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_K = 0.15;
const MAX_K = 2.5;
const clampK = (k) => Math.min(MAX_K, Math.max(MIN_K, k));

export const useCanvasGestures = () => {
  const boxRef = useRef(null);
  const [t, setT] = useState({ k: 0.6, x: 0, y: 0 });
  const pointers = useRef(new Map()); // pointerId → {x, y}
  const pinch = useRef(null); // 兩指起始狀態
  const dragged = useRef(false); // 這次互動有沒有移動過（用來分辨「點擊」與「拖曳」）

  // 以畫布上的某個點為圓心縮放
  const zoomAt = useCallback((cx, cy, factor) => {
    setT((prev) => {
      const k = clampK(prev.k * factor);
      const scale = k / prev.k;
      return { k, x: cx - (cx - prev.x) * scale, y: cy - (cy - prev.y) * scale };
    });
  }, []);

  // 滾輪縮放：要 passive:false 才能 preventDefault，擋掉整頁捲動
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    const onWheel = (e) => {
      e.preventDefault();
      const rect = box.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // 觸控板的雙指平移（ctrlKey=false 且位移小）也當成縮放會很煩，
      // 所以按住 ctrl／⌘ 或一般滾輪都縮放，shift 則水平平移
      if (e.shiftKey) {
        setT((prev) => ({ ...prev, x: prev.x - e.deltaY }));
        return;
      }
      zoomAt(cx, cy, Math.exp(-e.deltaY * 0.0015));
    };

    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    // 先記下指標再要求 capture：第二根手指要 capture 常會被瀏覽器拒絕（already captured），
    // 若順序反過來，例外會讓第二指沒被記錄，捏合就退化成單指平移
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    if (pointers.current.size === 1) {
      try {
        boxRef.current?.setPointerCapture?.(e.pointerId);
      } catch {
        /* 拿不到 capture 也不影響，事件仍在容器上 */
      }
    }

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  };

  const onPointerMove = (e) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size === 2 && pinch.current) {
      // 兩指：捏合縮放 ＋ 中心點跟著移動
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const rect = boxRef.current.getBoundingClientRect();
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

    // 單指／左鍵：平移
    const dx = cur.x - prev.x;
    const dy = cur.y - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragged.current = true;
    setT((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  };

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  // 把整張圖縮到剛好看得完
  const fit = useCallback((view) => {
    const box = boxRef.current;
    if (!box || !view?.width) return;
    const pad = 24;
    const k = clampK(
      Math.min(
        (box.clientWidth - pad * 2) / view.width,
        (box.clientHeight - pad * 2) / view.height
      )
    );
    setT({
      k,
      x: (box.clientWidth - view.width * k) / 2 - view.minX * k,
      y: pad,
    });
  }, []);

  // 把某個座標移到畫面中央（跟著玩家目前位置用）；可指定縮放
  const centerOn = useCallback((x, y, k) => {
    const box = boxRef.current;
    if (!box) return;
    setT((p) => {
      const nk = k ? clampK(k) : p.k;
      return {
        k: nk,
        x: box.clientWidth / 2 - x * nk,
        // 不要把畫面捲到圖的上方去（開頭那幾個節點會被推到畫面正中間、上面一片空白）
        y: Math.min(16, box.clientHeight / 2 - y * nk),
      };
    });
  }, []);

  // 預設視角：看得清楚字的比例，水平置中、從頂端開始
  const resetView = useCallback((view, k = 0.6) => {
    const box = boxRef.current;
    if (!box || !view?.width) return;
    setT({
      k,
      x: box.clientWidth / 2 - (view.minX + view.width / 2) * k,
      y: 16,
    });
  }, []);

  return {
    boxRef,
    transform: t,
    setTransform: setT,
    zoomAt,
    fit,
    centerOn,
    resetView,
    wasDragged: () => dragged.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onPointerLeave: endPointer,
    },
  };
};
