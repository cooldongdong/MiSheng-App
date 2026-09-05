// useSwipeFlow.js
// 玩家端的上下滑：上滑＝按 Next，下滑＝回上一頁。
//
// 定位是「按鈕的捷徑」（Dong 2026-08-28 拍板），不是取代按鈕。捷徑的意思是它做的事
// 必須跟按鈕一模一樣，不多也不少：
//   ① 能不能上滑，用的是跟鍵盤 ↓ 同一個 canAdvance——不另立第二套「這頁能不能走」
//   ② 打字機還在打的時候上滑照樣前進：按 Next 本來就會，捷徑不該比按鈕聰明。
//      「上滑＝跳完打字」會讓同一個手勢在同一頁有三個意思，那正是選捷徑要避開的
//
// **不能前進的頁面照樣拉得動**（Dong 2026-08-28 二次回饋，推翻本檔第一版的「完全不動」）。
// 第一版讓不能走的頁面一動也不動，理由是「畫面不動本身就是答案」。那是把判斷丟給玩家
// 自己推論，而 這個功能立案時列的頭號風險正是「玩家不知道現在算哪一種，一直往上滑以為卡住了」——
// 不動只是**沒有回答**，不是回答。改成拉得動，然後在露出來的空間裡直接講為什麼不能過去。
//
// 兩種手感刻意不同，這是整個設計的關鍵：
//   - 走得過去：1:1 跟手（短影片的手感）
//   - 走不過去：起手也是 1:1，但立刻愈拉愈重、拉不走、一定彈回（iOS 橡皮筋的老語彙）
// 手指還沒放開就已經知道結果，不必先讀字。
//
// 為什麼用 pointer 而不是 touch：滑鼠／觸控／觸控筆同一條路，而且 pointercancel
// 是唯一收得到「系統或原生捲動把這個手勢接手了」的訊號。
//
// 為什麼不吃滑鼠：桌機拖曳翻頁會跟選字打架，而桌機已經有鍵盤（鍵盤翻頁）。

import { useCallback, useEffect, useRef, useState } from 'react';

const LOCK = 8; // 判定方向前要先移動這麼多，否則點一下的微小抖動會被當成滑
const THRESHOLD = 64; // 放開時位移超過這個就算數
const VELOCITY = 0.45; // px/ms。甩得夠快就不必滑滿——短影片的手感在這裡
const MAX_DRAG = 150; // 跟手的上限，超過改成 1/4 阻尼，才有「拉到底了」的實感
const RUBBER = 120; // 走不過去時的漸近上限：拉到死也只到這裡
const CLICK_GUARD = 20; // 拉超過這麼多就不算點擊了
// 手勢結束後，屬於這一次手勢的那一下 click 會在幾毫秒內到。開這麼窄的窗是刻意的：
// 窗開太久會吃掉使用者「看到提示、馬上去點按鈕」的那一下真點擊（見 swallowNextClick）
const CLICK_TAIL_MS = 120;
const TURN_MS = 200;
const SPRING_MS = 240;

const REST = { y: 0, ms: 0 };

const isTypingTarget = (el) =>
  !!el &&
  (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

// 起點所在的那個可捲容器，往這個方向還捲得動嗎——回傳它本人，讓呼叫端決定怎麼辦。
//
// 為什麼回傳元素而不是布林值：**「讓給誰」有兩個答案，不是一個。**
// 由那個元素自己的 touch-action 決定（見 onMove）：
//   pan-y  → 瀏覽器在管它的捲動（有慣性、有回彈），我們整個讓開
//   none   → 瀏覽器不會碰它，得由我們自己捲，捲到底再接手翻頁
//
// dir='up'（手指往上）＝內容要往後捲 → scrollTop 變大 → 還沒到底就算「還捲得動」。
const findScroller = (start, root, dir) => {
  let el = start;
  while (el && el instanceof Element) {
    const oy = getComputedStyle(el).overflowY;
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if (dir === 'up' && !atBottom) return el;
      if (dir === 'down' && !atTop) return el;
    }
    if (el === root) break;
    el = el.parentElement;
  }
  return null;
};

// 走得過去：幾乎 1:1，只在很後面才收一點
const damp = (d) => {
  const sign = Math.sign(d);
  const a = Math.abs(d);
  return sign * (a <= MAX_DRAG ? a : MAX_DRAG + (a - MAX_DRAG) * 0.25);
};

// 走不過去：起手斜率剛好是 1（所以一開始跟手，不會有「被黏住」的頓挫），
// 之後指數收斂到 RUBBER。拉到死也過不去，手上就知道了。
const rubber = (d) => Math.sign(d) * RUBBER * (1 - Math.exp(-Math.abs(d) / RUBBER));

const useSwipeFlow = ({
  enabled = false,
  canAdvance = false,
  onNext,
  canGoBack = false,
  onBack,
}) => {
  const containerRef = useRef(null);
  const [t, setT] = useState(REST);
  // 這一次手勢在看的是哪個方向、以及走不走得過去。外面用它決定露出來的那塊要放
  // 「下一頁是什麼」還是「為什麼不能過去」。
  // 它活得比手指久——要撐過彈回或翻頁的動畫，否則卡片會在頁面還沒回到位就先消失。
  const [peek, setPeek] = useState(null);

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
  // 於是「退回上一頁」跟「選了這個選項」會同時發生。走不過去的那種拉扯也要吞——
  // 拉了 100px 又彈回來，那顯然不是在點東西。
  //
  // **改成一個常駐的監聽器 ＋ 一個時間戳（Dong 2026-08-28 回報的 bug）。** 原本是
  // 每次手勢結束就掛一個一次性的 click 監聽器、再用 setTimeout 在 500ms 後拆掉它。
  // 兩個錯疊在一起：
  //   ① 500ms 太長——屬於這次手勢的 click 幾毫秒內就到了，剩下的窗口全在吃使用者
  //      「拉一下看到提示、馬上去點選項」的那一下真點擊。實測就是這樣：Quiz 頁上拉
  //      一次之後，第一下點選項沒反應，第二下才行。
  //   ② 那個 setTimeout 被丟進 timers，而 onPointerDown 會 clearTimers()——於是只要
  //      使用者在 500ms 內又按下去，拆監聽器的那個 timer 就被清掉了，監聽器**永遠留著**，
  //      直到吃掉某一次點擊為止。
  // 現在沒有任何 timer：窗口靠時間戳自己過期，關不掉也漏不掉。
  // 判準是「**這一次手勢之後、下一次觸碰之前**」，不是一段時間。
  //
  // 尾隨的那一下 click 是瀏覽器在 pointerup 之後立刻補的，一定早於使用者的下一次
  // 觸碰。所以只要有新的 pointerdown，窗口就作廢——之後那一下 click 屬於新的動作。
  //
  // 這個判準換過兩次，兩次都是因為它吃掉了真的點擊：
  //   2026-08-28（Quiz 選項）：窗口 500ms → 120ms。只是縮短，判準沒換。
  //   2026-09-05（放大鈕）：加了「目標是不是手勢起點」，**但那個比對用 contains()，
  //     而放大鈕正好是手勢起點那棵子樹裡的元素**，於是照樣被吃。
  // ⇒ 時間與位置都不是這件事的本質，「有沒有開始新的一次觸碰」才是。
  const swallowUntil = useRef(0);
  useEffect(() => {
    const onClick = (e) => {
      if (performance.now() > swallowUntil.current) return;
      swallowUntil.current = 0; // 只吃一下
      e.preventDefault();
      e.stopPropagation();
    };
    // 捕獲階段、掛在 window：新的觸碰一開始就讓上一次的窗口失效
    const onAnyDown = () => {
      swallowUntil.current = 0;
    };
    window.addEventListener('click', onClick, true);
    window.addEventListener('pointerdown', onAnyDown, true);
    return () => {
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('pointerdown', onAnyDown, true);
    };
  }, []);
  const swallowNextClick = useCallback(() => {
    swallowUntil.current = performance.now() + CLICK_TAIL_MS;
  }, []);

  // 翻頁＝整頁滑滿一個容器高度，讓底下那張預覽剛好就位，然後把位移歸零、換頁。
  //
  // 第一版是「舊頁淡出 → 換頁 → 新頁淡入」，那會在中間閃一下白（Dong 2026-08-28 回報）：
  // opacity 掉到 0 的時候，透出來的是 GameShell 的 game.bg，淺色模式下那是 #eee。
  // 但下面本來就已經有真正的下一頁了——**要換的東西已經在畫面上，沒有任何理由先把它
  // 藏起來再拿出來**。滑滿一頁之後預覽所在的位置就是新頁該在的位置，於是歸零與換頁
  // 可以在同一個 render 裡發生，中間不存在「兩張頁面都不在」的那一刻。
  //
  // 順帶收掉了進場那段的 rAF ——沒有第二段動畫，也就沒有「分頁在背景時 rAF 停擺、
  // 畫面卡在透明」那個 bug（本檔前一版靠一條 setTimeout 保險絲擋著）。
  const commit = useCallback(
    (dir) => {
      const go = dir === 'up' ? onNext : onBack;
      if (!go) return;

      const h = containerRef.current?.clientHeight || 0;
      if (!h || prefersReducedMotion() || document.hidden) {
        setT(REST);
        setPeek(null);
        go();
        return;
      }

      busy.current = true;
      // 從這一刻起，那張預覽不再是「預覽」——玩家已經決定要過去了，所以它要換成
      // 完整的那一頁再滑進來。不換的話，滑完之後才把內容補上，看起來就是閃一下
      // （Dong 2026-08-28 回報）。防劇透的理由到這裡也結束了：他就是要去那裡。
      setPeek((p) => (p ? { ...p, committing: true } : p));
      setT({ y: dir === 'up' ? -h : h, ms: TURN_MS });
      timers.current.push(
        setTimeout(() => {
          // 這兩件事必須同一批：位移歸零的同時換頁。React 會一起 commit，
          // 所以畫面上不會出現「已經歸零、但還是舊頁」的那一格。
          go();
          setPeek(null);
          setT(REST);
          busy.current = false;
        }, TURN_MS)
      );
    },
    [onNext, onBack]
  );

  const springBack = useCallback(() => {
    setT({ y: 0, ms: SPRING_MS });
    // 卡片要陪著頁面一起回去，不能先消失
    timers.current.push(setTimeout(() => setPeek(null), SPRING_MS));
  }, []);

  const finish = useCallback(
    (cancelled) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;

      // 拉得夠遠就不是點擊——**用 downY 不用 startY**，而且要在 locked 的早退之前。
      // 只捲了對白框、沒翻頁的那種手勢也算：原生捲動會自己壓掉尾隨的 click，
      // 但我們是自己捲的，不壓就會在放開時點到底下的東西。
      if (Math.abs(d.lastY - d.downY) > CLICK_GUARD) swallowNextClick();
      if (!d.locked) return;

      const dy = d.lastY - d.startY;

      // 走不過去的那一種，無論拉多遠都是彈回——這就是它要表達的事
      if (!cancelled && !d.blocked) {
        const dt = Math.max(1, performance.now() - d.startTime);
        const far = Math.abs(dy) > THRESHOLD;
        const fast = Math.abs(dy) / dt > VELOCITY && Math.abs(dy) > LOCK * 2;
        if (far || fast) {
          commit(d.dir);
          return;
        }
      }
      springBack();
    },
    [commit, springBack, swallowNextClick]
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

        // 這一下該不該歸捲動（長對白還沒讀完）。這條優先權最高：
        // 讀不完就被翻頁，比不知道為什麼不能翻頁嚴重得多。
        //
        // 但「歸捲動」有兩種，由那個可捲元素自己的 touch-action 宣告：
        //
        //   pan-y（ContentList 這種長清單）——瀏覽器在管，讓開就對了。
        //     原生捲動有慣性與回彈，自己重做只會更差。
        //
        //   none（對白框 TalkText／QuestionText）——**瀏覽器不會碰它**，
        //     讓開等於誰都不動。得自己把位移換成 scrollTop，捲到底之後
        //     再把剩下的位移交給翻頁。
        //
        // 為什麼對白框要走第二條：宣告 pan-y 的話，瀏覽器會在手指按下那一刻
        // 就取得整段手勢的所有權，而且**不會中途交還**——於是「捲到底就能翻頁」
        // 在 Chrome 上永遠不會發生（Dong 的 Android 9 實測：捲到底往上滑仍然
        // 翻不了頁）。iOS Safari 交還得比較鬆，所以同一份 code 在 iPhone 上
        // 看起來是好的，這正是兩邊行為不同的根本原因。
        if (!d.scroller) {
          const el = findScroller(d.target, containerRef.current, dir);
          if (el) {
            if (getComputedStyle(el).touchAction !== 'none') {
              drag.current = null; // 瀏覽器在管它，整個讓開
              return;
            }
            d.scroller = el;
            d.scrollLastY = e.clientY;
          }
        }

        if (d.scroller) {
          const el = d.scroller;
          // 手指往上（clientY 變小）＝內容往後捲＝scrollTop 變大
          const delta = d.scrollLastY - e.clientY;
          d.scrollLastY = e.clientY;
          // **沒有位移就不能拿來判斷到底了沒。**
          // 剛認出這個可捲元素的那一格，scrollLastY 才剛被設成同一個 clientY，
          // delta 必定是 0——沒有這道防線的話「捲了但 scrollTop 沒變」會被當成
          // 「已經到底」，於是第一次移動就直接交棒給翻頁，捲動整個沒有機會發生。
          // （實測症狀：文字區可以翻頁了，但長對白完全捲不動，兩個平台都一樣。）
          if (delta === 0) return;
          const before = el.scrollTop;
          el.scrollTop = before + delta;
          // 真的捲動了 → 這一下就是捲動，翻頁不介入
          if (el.scrollTop !== before) return;
          // 捲不動了＝到底了。把剩下的位移交給翻頁，並從這一刻重新起算——
          // 於是還要再拉一個 LOCK 才會開始翻，不會在到底的瞬間突然跳一下。
          d.scroller = null;
          d.startY = e.clientY;
          return;
        }
        // 游標在輸入框裡時往下滑，多半是想捲畫面看清楚（或收鍵盤），不是要離開這一頁
        if (dir === 'down' && isTypingTarget(document.activeElement)) {
          drag.current = null;
          return;
        }

        d.locked = true;
        d.dir = dir;
        d.blocked = !(dir === 'up' ? canAdvance : canGoBack);
        d.startTime = performance.now();
        d.startY = e.clientY; // 從真正鎖定的那一刻起算，門檻才不會被前 8px 吃掉
        setPeek({ dir, blocked: d.blocked });
      }

      const raw = e.clientY - d.startY;
      setT({ y: d.blocked ? rubber(raw) : damp(raw), ms: 0 });
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
        springBack();
        return;
      }
      // 明確標了不吃手勢的地方（放大的圖、全螢幕道具）
      if (e.target instanceof Element && e.target.closest('[data-no-swipe]')) {
        return;
      }
      clearTimers(); // 上一次的彈回還沒清完就又按下來，別讓舊的 timer 把卡片收掉
      drag.current = {
        id: e.pointerId,
        target: e.target,
        startX: e.clientX,
        startY: e.clientY,
        // downY 是「手指最初按下的位置」，startY 會在鎖定與捲動交棒時被改寫。
        // 判斷「這一下算不算點擊」要用前者，否則捲了半天放開會補一個 click 出去
        downY: e.clientY,
        lastY: e.clientY,
        scroller: null,
        scrollLastY: e.clientY,
        startTime: performance.now(),
        locked: false,
        blocked: false,
        dir: null,
      };
    },
    [enabled, springBack]
  );

  // 不動的時候不給 transform：有 transform 的元素會成為底下所有 fixed 後代的定位
  // 基準，而外面那層是 overflow:hidden——靜止時保持沒有，放大的圖才不會被裁掉。
  const style = {
    transform: t.y === 0 && t.ms === 0 ? undefined : `translateY(${t.y}px)`,
    transition: t.ms
      ? `transform ${t.ms}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
      : 'none',
  };

  return { containerRef, onPointerDown, style, peek };
};

export default useSwipeFlow;
