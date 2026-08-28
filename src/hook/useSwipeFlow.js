// useSwipeFlow.js
// 玩家端的上下滑：上滑＝按 Next，下滑＝回上一頁。
//
// 定位是「按鈕的捷徑」（Dong 2026-08-28 拍板），不是取代按鈕。捷徑的意思是它做的事
// 必須跟按鈕一模一樣，不多也不少，於是三件事跟著就定了：
//   ① 能不能上滑，用的是跟鍵盤 ↓ 同一個 canAdvance——不另立第二套「這頁能不能走」
//   ② 打字機還在打的時候上滑照樣前進：按 Next 本來就會，捷徑不該比按鈕聰明。
//      「上滑＝跳完打字」會讓同一個手勢在同一頁有三個意思，那正是選捷徑要避開的
//   ③ 不能滑的頁面**完全不動**。沒有橡皮筋、沒有提示——畫面不動本身就是
//      「這頁不能滑」的回答，而且它不必先教就懂（issue COO-135 的原話：
//      不能滑的頁面就不給提示）
//
// 為什麼用 pointer 而不是 touch：滑鼠／觸控／觸控筆同一條路，而且 pointercancel
// 是唯一收得到「系統或原生捲動把這個手勢接手了」的訊號。
//
// 為什麼不吃滑鼠：桌機拖曳翻頁會跟選字打架，而桌機已經有鍵盤（COO-134）。
// 同一件事給兩套手感沒有好處，少的那一套就不要做。

import { useCallback, useEffect, useRef, useState } from 'react';

const LOCK = 8; // 判定方向前要先移動這麼多，否則點一下的微小抖動會被當成滑
const THRESHOLD = 64; // 放開時位移超過這個就算數
const VELOCITY = 0.45; // px/ms。甩得夠快就不必滑滿——短影片的手感在這裡
const MAX_DRAG = 150; // 跟手的上限，超過改成 1/4 阻尼，才有「拉到底了」的實感
const LEAVE_MS = 170;
const ENTER_MS = 210;

const REST = { y: 0, o: 1, ms: 0 };

const isTypingTarget = (el) =>
  !!el &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// 起點所在的那個可捲容器，往這個方向還捲得動嗎——捲得動就把這一下整個讓給它。
//
// 觸控時瀏覽器自己會在原生捲動開始的瞬間發 pointercancel 把手勢收走，但兩種情況
// 收不到：桌機的拖曳，以及「已經捲到底」的邊界（那時根本不會發生捲動）。
// 所以這裡自己判一次，兩條路才會給出同一個答案。
//
// dir='up'（手指往上）＝內容要往後捲 → scrollTop 變大 → 還沒到底就讓行。
const deferToScroller = (start, root, dir) => {
  let el = start;
  while (el && el instanceof Element) {
    const oy = getComputedStyle(el).overflowY;
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      const atTop = el.scrollTop <= 0;
      const atBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if (dir === 'up' && !atBottom) return true;
      if (dir === 'down' && !atTop) return true;
    }
    if (el === root) break;
    el = el.parentElement;
  }
  return false;
};

const damp = (d) => {
  const sign = Math.sign(d);
  const a = Math.abs(d);
  return sign * (a <= MAX_DRAG ? a : MAX_DRAG + (a - MAX_DRAG) * 0.25);
};

const useSwipeFlow = ({
  enabled = false,
  canAdvance = false,
  onNext,
  canGoBack = false,
  onBack,
}) => {
  const containerRef = useRef(null);
  const [t, setT] = useState(REST);

  // 一次手勢的全部狀態。放 ref 不放 state：pointermove 每秒幾十次，
  // 每一次都重 render 只是為了記錄一個還沒生效的數字。
  const drag = useRef(null);
  const busy = useRef(false); // 轉場進行中：這段時間不收新手勢
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // 手勢走完之後緊接著會冒出來的那一下 click，要吞掉。
  //
  // 在 Quiz 的選項上往下滑回上一頁，手指離開時瀏覽器仍會補一個 click 給那顆選項，
  // 於是「退回上一頁」跟「選了這個選項」會同時發生。這與 useCanvasGestures 當年
  // 被 setPointerCapture 咬到的是同一類：手勢與點擊共用同一串事件。
  const swallowNextClick = useCallback(() => {
    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('click', onClick, true);
    };
    window.addEventListener('click', onClick, true);
    timers.current.push(
      setTimeout(() => window.removeEventListener('click', onClick, true), 500)
    );
  }, []);

  const commit = useCallback(
    (dir) => {
      const go = dir === 'up' ? onNext : onBack;
      if (!go) return;
      swallowNextClick();

      // 看不到的時候不做動畫：頁面在背景時 requestAnimationFrame 整個停擺，
      // 下面那段進場就永遠跑不完，畫面會卡在 opacity:0——實測（背景分頁）真的會。
      // 玩家在戶外滑一下就抬頭看路、或切去接電話，正是這個情境。
      if (prefersReducedMotion() || document.hidden) {
        setT(REST);
        go();
        return;
      }

      busy.current = true;
      const h = containerRef.current?.clientHeight || 600;
      const away = Math.max(120, h * 0.35) * (dir === 'up' ? -1 : 1);

      // 舊的那一頁往手指的方向離場
      setT({ y: away, o: 0, ms: LEAVE_MS });
      timers.current.push(
        setTimeout(() => {
          go();
          // 新的一頁從反方向進場。先用 ms:0 把起點放好，再等兩個 frame 才開
          // transition——同一個 frame 內改兩次，瀏覽器只會看到最後那次，動畫不會發生。
          setT({ y: dir === 'up' ? 28 : -28, o: 0, ms: 0 });
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setT({ y: 0, o: 1, ms: ENTER_MS }))
          );
          timers.current.push(
            setTimeout(() => {
              busy.current = false;
              // 保險絲：上面那兩層 rAF 沒跑到（分頁被切到背景、瀏覽器省電模式）
              // 就直接把畫面歸位。動畫沒了沒關係，畫面留在透明才是壞掉——
              // 而且那是使用者回來以後才會看到的壞掉，最難查。
              setT((prev) => (prev.o === 1 && prev.y === 0 ? prev : REST));
            }, ENTER_MS + 300)
          );
        }, LEAVE_MS)
      );
    },
    [onNext, onBack, swallowNextClick]
  );

  const finish = useCallback(
    (cancelled) => {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.locked) return;

      if (!cancelled) {
        const dy = d.lastY - d.startY;
        const dt = Math.max(1, performance.now() - d.startTime);
        const far = Math.abs(dy) > THRESHOLD;
        const fast = Math.abs(dy) / dt > VELOCITY && Math.abs(dy) > LOCK * 2;
        if (far || fast) {
          commit(d.dir);
          return;
        }
      }
      // 沒過門檻（或被系統收走）就彈回去
      setT({ y: 0, o: 1, ms: 220 });
    },
    [commit]
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const onMove = (e) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;

      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      d.lastY = e.clientY;

      if (!d.locked) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > LOCK) {
          // 橫向：不是我們的手勢
          drag.current = null;
          return;
        }
        if (Math.abs(dy) < LOCK) return;

        const dir = dy < 0 ? 'up' : 'down';

        // 這一下該不該歸原生捲動（長對白還沒讀完）
        if (deferToScroller(d.target, containerRef.current, dir)) {
          drag.current = null;
          return;
        }
        // 這個方向這一頁能不能走。不能就整個放掉——不動，也不彈
        const allowed = dir === 'up' ? canAdvance : canGoBack;
        if (!allowed) {
          drag.current = null;
          return;
        }
        // 游標在輸入框裡時往下滑，多半是想捲畫面看清楚，不是要離開這一頁
        if (dir === 'down' && isTypingTarget(document.activeElement)) {
          drag.current = null;
          return;
        }
        d.locked = true;
        d.dir = dir;
        d.startTime = performance.now();
        d.startY = e.clientY; // 從真正鎖定的那一刻起算，門檻才不會被前 8px 吃掉
      }

      setT({ y: damp(e.clientY - d.startY), o: 1, ms: 0 });
    };

    const onUp = (e) => {
      if (drag.current && e.pointerId !== drag.current.id) return;
      finish(false);
    };
    const onCancel = (e) => {
      if (drag.current && e.pointerId !== drag.current.id) return;
      finish(true);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [enabled, canAdvance, canGoBack, finish]);

  const onPointerDown = useCallback(
    (e) => {
      if (!enabled || busy.current) return;
      // 滑鼠不吃（見檔頭）；第二根手指按下＝捏合，把已經在跑的那一下放掉
      if (e.pointerType === 'mouse') return;
      if (drag.current) {
        drag.current = null;
        setT({ y: 0, o: 1, ms: 220 });
        return;
      }
      // 明確標了不吃手勢的地方（放大的圖、全螢幕道具）
      if (e.target instanceof Element && e.target.closest('[data-no-swipe]')) {
        return;
      }
      drag.current = {
        id: e.pointerId,
        target: e.target,
        startX: e.clientX,
        startY: e.clientY,
        lastY: e.clientY,
        startTime: performance.now(),
        locked: false,
        dir: null,
      };
    },
    [enabled]
  );

  const style = {
    transform: t.y === 0 && t.ms === 0 ? undefined : `translateY(${t.y}px)`,
    opacity: t.o,
    transition: t.ms
      ? `transform ${t.ms}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${t.ms}ms ease`
      : 'none',
  };

  return { containerRef, onPointerDown, style };
};

export default useSwipeFlow;
