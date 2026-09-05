import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

// 現場量測用的小面板。**只在網址帶 ?diag=1 時出現**，平常完全不存在。
//
// 為什麼需要它：2026-09-05 Dong 在 Android 上回報「翻頁後兩秒內按不動任何東西」，
// 而我在桌機的 Chromium 上重現不了，連續猜錯兩次（先猜 click 被吞、再猜打字機把
// 主執行緒佔住）。**猜第三次的成本已經高於做一個能看的東西。**
//
// 它要回答的是一個是非題：
//
//   pointerdown 有進來、click 沒有  → 事件被吃掉（有東西擋著、或 click 被攔截）
//   兩個都沒進來                    → 主執行緒卡住，事件根本還沒被處理
//   兩個都有、但畫面沒反應          → 事件有到，是處理它的 code 沒做事
//
// 這三種的修法完全不同，而在手機上唯一分得出來的辦法就是把數字印在螢幕上。
const DiagOverlay = () => {
  const [state, setState] = useState({
    down: 0,
    up: 0,
    cancel: 0,
    click: 0,
    lastGap: '-',
    fate: '-',
    move: '-',
    target: '-',
    longTask: '-',
    longTotal: 0,
  });
  const downAt = useRef(0);
  const downTarget = useRef(null);
  const downPos = useRef({ x: 0, y: 0 });
  const label = (el) =>
    el instanceof Element
      ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`
      : '?';

  useEffect(() => {
    const onDown = (e) => {
      downAt.current = performance.now();
      downTarget.current = e.target;
      downPos.current = { x: e.clientX, y: e.clientY };
      setState((s) => ({ ...s, down: s.down + 1 }));
    };
    // 有 up 沒有 click ⇒ 按下與放開之間，那個元素被換掉了（React 重掛），
    // 瀏覽器就不會生 click。有 cancel ⇒ 手勢被瀏覽器接管（捲動／下拉更新）。
    const onUp = (e) => {
      const t = downTarget.current;
      const still = t instanceof Node ? t.isConnected : null;
      // 手指從按下到放開移動了多少。超過瀏覽器的容忍值（Android 約 8–15px）
      // 就會被當成拖曳而不是點擊，click 不會生出來。
      const dist = Math.round(
        Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y)
      );
      // 放開的那一刻，手指底下是不是同一個元素。不同的話瀏覽器會把 click 發給
      // 兩者的共同祖先——如果連共同祖先都沒有（其中一個被換掉），就不發。
      const same = t === e.target;
      setState((s) => ({
        ...s,
        up: s.up + 1,
        fate: still === null ? '?' : still ? '元素還在' : '元素已被換掉',
        move: `${dist}px`,
        target: same ? `同一個 ${label(t)}` : `${label(t)} → ${label(e.target)}`,
      }));
    };
    const onCancel = () => setState((s) => ({ ...s, cancel: s.cancel + 1 }));
    const onClick = (e) => {
      const gap = downAt.current ? Math.round(performance.now() - downAt.current) : -1;
      const tag = `${e.target?.tagName || '?'}`.toLowerCase();
      setState((s) => ({ ...s, click: s.click + 1, lastGap: `${gap}ms ${tag}` }));
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onCancel, true);
    window.addEventListener('click', onClick, true);

    // 長任務＝主執行緒被佔住超過 50ms 的那一段。Chrome／Android 支援，Safari 沒有。
    let obs = null;
    try {
      obs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const max = Math.round(Math.max(...entries.map((e) => e.duration)));
        const sum = Math.round(entries.reduce((a, e) => a + e.duration, 0));
        setState((s) => ({
          ...s,
          longTask: `${max}ms`,
          longTotal: s.longTotal + sum,
        }));
      });
      obs.observe({ entryTypes: ['longtask'] });
    } catch {
      // 不支援就算了（Safari）
    }
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onCancel, true);
      window.removeEventListener('click', onClick, true);
      obs?.disconnect();
    };
  }, []);

  return (
    <Box
      onClick={() =>
        setState({
          down: 0,
          up: 0,
          cancel: 0,
          click: 0,
          lastGap: '-',
          fate: '-',
          move: '-',
          target: '-',
          longTask: '-',
          longTotal: 0,
        })
      }
      sx={{
        position: 'fixed',
        top: 44,
        left: 8,
        zIndex: 2000,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'rgba(0,0,0,0.75)',
        color: '#0f0',
        font: '11px/1.5 ui-monospace, monospace',
        whiteSpace: 'pre',
        pointerEvents: 'auto',
      }}
    >
      {`down ${state.down} up ${state.up} cancel ${state.cancel} click ${state.click}
放開時 ${state.fate}
位移 ${state.move}
目標 ${state.target}
gap  ${state.lastGap}
long ${state.longTask} (累計 ${state.longTotal}ms)
（點我歸零）`}
    </Box>
  );
};

export default DiagOverlay;
