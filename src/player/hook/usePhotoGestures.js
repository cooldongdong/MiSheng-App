import { useCallback, useEffect, useRef, useState } from 'react';

// 全螢幕看圖的手勢：雙指縮放、雙擊放大、放大後單指平移、未放大時單指下滑關閉、
// 點一下收起／叫回介面。
//
// **為什麼要自己接管縮放，而不是交給瀏覽器**：瀏覽器的雙指縮放縮的是「整個頁面」，
// 左上角的品牌標、右上角那排按鈕會跟著一起變大（Dong 2026-09-05 在手機上回報
// 「感覺不太對」）。看謎面要放大的是圖，不是介面。
//
// **為什麼值得做**：這是實境解謎——圖片本身就是謎面，看不清楚等於玩不下去。
//
// 沿用 useOverlayGestures 檔頭記下的兩個坑：
//   ① 不要 setPointerCapture（會把 click 一起導向容器，按鈕就收不到了），
//      拖曳期間改在 window 上聽。
//   ② 縮放的數學要「以某一點為圓心」，否則放大時圖會朝角落漂走。

const MIN_SCALE = 1; // 不給縮到比原本小——這是看圖不是排版
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

const DISMISS_PX = 110; // 放開時位移超過這麼多就關閉
const DISMISS_VELOCITY = 0.6; // 或甩得夠快（px/ms）
const TAP_SLOP = 8; // 位移小於這個才算「點一下」
const TAP_MS = 400;
const DOUBLE_TAP_MS = 280; // 兩次點擊之間短於這個算雙擊
const DOUBLE_TAP_SLOP = 40;

const IDENTITY = { scale: 1, x: 0, y: 0 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 以 origin 為圓心把 base 縮放 factor 倍，再整體平移 pan。
// 圖片是 left/top 50% ＋ translate(-50%,-50%) 定位的，所以 (x, y) 的意思是
// 「圖心相對於容器中心的位移」——換算時先加回中心，算完再減掉。
const zoomAbout = (base, center, origin, factor, pan = { x: 0, y: 0 }) => {
  const scale = clamp(base.scale * factor, MIN_SCALE, MAX_SCALE);
  // 撞到上下限時要用**真正生效的倍率**重算位置，否則圖會邊卡住邊漂走
  const f = base.scale === 0 ? 1 : scale / base.scale;
  const cx = center.x + base.x;
  const cy = center.y + base.y;
  return {
    scale,
    x: origin.x + (cx - origin.x) * f + pan.x - center.x,
    y: origin.y + (cy - origin.y) * f + pan.y - center.y,
  };
};

// 放大之後才允許平移，而且不讓圖離開容器太遠——單邊最多露出半個容器
const clampPan = (t, size) => {
  if (t.scale <= 1) return { ...t, x: 0, y: 0 };
  // 量不到尺寸時（還沒排版、或元素被隱藏）不要夾——夾出來的上限是 0，
  // 等於整個平移失效，而那看起來會像「拖不動」而不是「量不到」
  if (!size.w || !size.h) return t;
  const limitX = ((t.scale - 1) * size.w) / 2;
  const limitY = ((t.scale - 1) * size.h) / 2;
  return {
    ...t,
    x: clamp(t.x, -limitX, limitX),
    y: clamp(t.y, -limitY, limitY),
  };
};

/**
 * @param onDismiss 判定為「關閉」時呼叫
 * @param onTap     判定為「單擊」時呼叫（收起／叫回介面）
 * @returns { transform, dy, dragging, zoomed, reset, handlers, ref }
 */
export const usePhotoGestures = ({ onDismiss, onTap }) => {
  const ref = useRef(null); // 圖片元素，用來量中心與尺寸
  const [transform, setTransform] = useState(IDENTITY);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pointers = useRef(new Map()); // pointerId → 座標
  const gesture = useRef(null); // 這次手勢的起點快照
  const lastTap = useRef(null); // 上一次單擊（判雙擊用）
  const tapTimer = useRef(null);

  const cbs = useRef({ onDismiss, onTap });
  cbs.current = { onDismiss, onTap };

  const metrics = useCallback(() => {
    const el = ref.current;
    const r = el?.getBoundingClientRect();
    if (!r) return { center: { x: 0, y: 0 }, size: { w: 0, h: 0 } };
    return {
      // 量的是**目前**的框，所以要把已經套用的位移扣掉才是容器中心
      center: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
      size: { w: r.width, h: r.height },
    };
  }, []);

  const reset = useCallback(() => {
    setTransform(IDENTITY);
    setDy(0);
    setDragging(false);
    pointers.current.clear();
    gesture.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      const pts = [...pointers.current.values()];
      const { center } = metrics();

      if (pts.length === 1) {
        gesture.current = {
          kind: 'single',
          start: { x: event.clientX, y: event.clientY },
          base: transform,
          center,
          t: Date.now(),
          moved: false,
        };
        setDragging(true);
        return;
      }
      if (pts.length === 2) {
        // 第二根手指下去：這次是捏合，之前的單指判定整個作廢
        const [a, b] = pts;
        gesture.current = {
          kind: 'pinch',
          base: transform,
          center,
          startDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
          startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
        setDy(0);
        setDragging(true);
      }
    },
    [metrics, transform]
  );

  useEffect(() => {
    const onMove = (event) => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      const g = gesture.current;
      if (!g) return;
      const pts = [...pointers.current.values()];

      if (g.kind === 'pinch' && pts.length >= 2) {
        const [a, b] = pts;
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const pan = { x: mid.x - g.startMid.x, y: mid.y - g.startMid.y };
        const next = zoomAbout(g.base, g.center, g.startMid, dist / g.startDist, pan);
        setTransform(clampPan(next, metrics().size));
        return;
      }

      if (g.kind !== 'single') return;
      const dx = event.clientX - g.start.x;
      const delta = event.clientY - g.start.y;
      if (Math.abs(dx) > TAP_SLOP || Math.abs(delta) > TAP_SLOP) g.moved = true;

      if (g.base.scale > 1) {
        // 放大之後單指是平移
        setTransform(
          clampPan({ ...g.base, x: g.base.x + dx, y: g.base.y + delta }, metrics().size)
        );
      } else {
        // 沒放大時單指往下滑是關閉。往上不給位移，但仍算「動過了」，
        // 免得往上滑一段再放開被誤判成點一下。
        setDy(Math.max(0, delta));
      }
    };

    const onUp = (event) => {
      pointers.current.delete(event.pointerId);
      const g = gesture.current;
      if (!g) return;
      // 捏合的兩根手指還沒放完，等下一根
      if (pointers.current.size > 0) return;
      gesture.current = null;
      setDragging(false);

      if (g.kind === 'pinch') {
        // 縮回 1 倍就順手歸位，免得停在一個歪掉的位置
        setTransform((t) => (t.scale <= 1.02 ? IDENTITY : t));
        return;
      }

      const elapsed = Date.now() - g.t;
      const delta = Math.max(0, event.clientY - g.start.y);
      const velocity = elapsed > 0 ? delta / elapsed : 0;
      setDy(0);

      if (!g.moved && elapsed < TAP_MS) {
        const now = Date.now();
        const prev = lastTap.current;
        const near =
          prev &&
          Math.hypot(event.clientX - prev.x, event.clientY - prev.y) < DOUBLE_TAP_SLOP;
        if (prev && now - prev.t < DOUBLE_TAP_MS && near) {
          // 雙擊：在 1 倍與 DOUBLE_TAP_SCALE 之間切換，以點到的那一點為圓心
          clearTimeout(tapTimer.current);
          lastTap.current = null;
          const { center, size } = metrics();
          setTransform((t) => {
            if (t.scale > 1) return IDENTITY;
            const origin = { x: event.clientX, y: event.clientY };
            return clampPan(
              zoomAbout(t, center, origin, DOUBLE_TAP_SCALE / t.scale),
              size
            );
          });
          return;
        }
        // 可能是雙擊的第一下——等一下再決定要不要當單擊處理
        lastTap.current = { x: event.clientX, y: event.clientY, t: now };
        clearTimeout(tapTimer.current);
        tapTimer.current = setTimeout(() => {
          lastTap.current = null;
          cbs.current.onTap?.();
        }, DOUBLE_TAP_MS);
        return;
      }

      // 放大狀態下的拖曳只是平移，不關閉
      if (g.base.scale > 1) return;
      if (delta > DISMISS_PX || velocity > DISMISS_VELOCITY) {
        cbs.current.onDismiss?.();
      }
    };

    const onCancel = (event) => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size === 0) {
        gesture.current = null;
        setDragging(false);
        setDy(0);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      clearTimeout(tapTimer.current);
    };
  }, [metrics]);

  return {
    ref,
    transform,
    dy,
    dragging,
    zoomed: transform.scale > 1,
    reset,
    handlers: { onPointerDown },
  };
};

export default usePhotoGestures;
