// useOverlayGestures.js
// 疊圖的對位手勢：單指拖曳、兩指捏合縮放＋旋轉、滾輪縮放、Shift＋拖曳旋轉。
//
// 為什麼桌機要另外有 Shift＋拖曳：旋轉本來只綁在兩指手勢上，但觸控板不會產生
// 兩個 pointer，於是桌機完全轉不動。macOS 觸控板的雙指旋轉會發 gesturechange，
// 但那是 WebKit 的非標準事件（只有 Safari 有），不能當唯一入口。
//
// 為什麼不複用 create/useCanvasGestures：
//   ① 它住在 src/create/（工具那一國），遊戲引擎去依賴它是反向依賴
//   ② 它是桌機白板的形狀（滑鼠／觸控板模式切換＋localStorage），這裡只有手機一種情境
//   ③ 它沒有旋轉，而「對位」少了旋轉就對不準
// 但沿用它踩過的坑：不要用 setPointerCapture（capture 會把後續事件連同 click
// 一起導向容器，控制列的按鈕會收不到），拖曳期間改在 window 上聽 move/up。

import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SCALE = 0.2;
const MAX_SCALE = 6;
const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export const IDENTITY = { x: 0, y: 0, scale: 1, rotation: 0 };

const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const angleDeg = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
// 兩指轉過 180° 時 atan2 會跳一圈，收斂回 (-180, 180] 才不會整張圖突然翻面
const normalizeAngle = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

// 以 origin 為圓心，把 base 縮放 factor 倍、轉 dRotation 度，再整體平移 dPan。
// 圖片是 left:50%/top:50% ＋ translate(-50%,-50%) 定位的，所以 (x, y) 的意思是
// 「圖心相對於容器中心的位移」——換算時要先加回容器中心，算完再減掉。
const applyGesture = (base, containerCenter, origin, factor, dRotation, dPan) => {
  const scale = clampScale(base.scale * factor);
  // 撞到上下限時要用「真正生效的倍率」重算位置，否則圖會邊卡住邊漂走
  const f = base.scale === 0 ? 1 : scale / base.scale;

  const cx = containerCenter.x + base.x;
  const cy = containerCenter.y + base.y;
  const vx = cx - origin.x;
  const vy = cy - origin.y;

  const rad = (dRotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return {
    x: origin.x + (vx * cos - vy * sin) * f + dPan.x - containerCenter.x,
    y: origin.y + (vx * sin + vy * cos) * f + dPan.y - containerCenter.y,
    scale,
    rotation: base.rotation + dRotation,
  };
};

export const useOverlayGestures = () => {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState(IDENTITY);

  const pointers = useRef(new Map()); // pointerId → 目前座標
  const gesture = useRef(null); // 手勢起點快照
  const shiftHeld = useRef(false); // 按下那一刻有沒有壓著 Shift（決定拖曳是平移還是旋轉）
  const transformRef = useRef(IDENTITY);
  transformRef.current = transform;

  const reset = useCallback(() => setTransform(IDENTITY), []);

  const containerCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  // 每次手指數量變動都重拍一次快照，否則放開一指的瞬間圖會跳一大段
  const snapshot = useCallback(() => {
    const pts = [...pointers.current.values()];
    const center = containerCenter();
    if (pts.length === 1 && shiftHeld.current) {
      // 繞「圖自己的中心」轉：transform-origin 就是圖心，所以旋轉不會讓圖跑掉
      const base = transformRef.current;
      const pivot = { x: center.x + base.x, y: center.y + base.y };
      gesture.current = {
        mode: 'rotate',
        base,
        center,
        pivot,
        angle: angleDeg(pivot, pts[0]),
      };
    } else if (pts.length === 1) {
      gesture.current = { mode: 'drag', base: transformRef.current, center, start: pts[0] };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = {
        mode: 'pinch',
        base: transformRef.current,
        center,
        mid: midpoint(a, b),
        dist: distance(a, b),
        angle: angleDeg(a, b),
      };
    } else {
      gesture.current = null;
    }
  }, [containerCenter]);

  const onPointerDown = useCallback(
    (event) => {
      // 只有第一根手指／滑鼠按下時才看 Shift；兩指捏合本來就會轉，不受影響
      if (pointers.current.size === 0) shiftHeld.current = event.shiftKey;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      snapshot();
    },
    [snapshot]
  );

  useEffect(() => {
    const onMove = (event) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      const g = gesture.current;
      if (!g) return;
      const pts = [...pointers.current.values()];

      if (g.mode === 'drag' && pts.length === 1) {
        setTransform({
          ...g.base,
          x: g.base.x + (pts[0].x - g.start.x),
          y: g.base.y + (pts[0].y - g.start.y),
        });
        return;
      }

      if (g.mode === 'rotate' && pts.length === 1) {
        setTransform({
          ...g.base,
          rotation: g.base.rotation + normalizeAngle(angleDeg(g.pivot, pts[0]) - g.angle),
        });
        return;
      }

      if (g.mode === 'pinch' && pts.length >= 2) {
        const [a, b] = pts;
        const mid = midpoint(a, b);
        setTransform(
          applyGesture(
            g.base,
            g.center,
            g.mid, // 縮放與旋轉的圓心＝兩指起始中點
            g.dist === 0 ? 1 : distance(a, b) / g.dist,
            normalizeAngle(angleDeg(a, b) - g.angle),
            { x: mid.x - g.mid.x, y: mid.y - g.mid.y } // 中點自己的位移＝順便平移
          )
        );
      }
    };

    const onUp = (event) => {
      if (!pointers.current.delete(event.pointerId)) return;
      if (pointers.current.size === 0) shiftHeld.current = false;
      snapshot();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [snapshot]);

  // 滾輪縮放：手機用不到，但少了它就沒辦法在瀏覽器裡驗收對位
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (event) => {
      event.preventDefault(); // 需要 passive:false，否則瀏覽器不讓擋捲動
      setTransform(
        applyGesture(
          transformRef.current,
          containerCenter(),
          { x: event.clientX, y: event.clientY },
          Math.exp(-event.deltaY * 0.0022),
          0,
          { x: 0, y: 0 }
        )
      );
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [containerCenter]);

  return { containerRef, transform, reset, onPointerDown };
};
