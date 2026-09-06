import { useEffect, useState } from 'react';
import { HINT_TICK_MS } from '../game/hintTimer';

// 讓「現在幾點」變成會自己前進的值。
//
// 提示的自動解鎖與導覽列的小紅點都要它——**沒有這個，畫面只會在別的原因觸發
// 重繪時才發現時間到了**，於是玩家盯著提示頁等，卻什麼都不會發生。
//
// 這個 hook 只產出一個數字。它不持有任何「提示」的狀態——解鎖與否是拿
// `Date.now() - 進關時刻` 去比的，所以重設這裡的計時器只改變「什麼時候去看」，
// 不改變「看到什麼」。
//
// ## 為什麼要對齊到牆上時鐘的整數倍
//
// setInterval 是「**從你呼叫它的那一刻起**每 N 毫秒跳一次」，所以起跑點決定了
// 它永遠會在哪些時刻醒來。導覽列在遊戲一開始就掛載、提示頁是切過去才掛載——
// 兩個都很準時，但準的是不同的時刻，而且會一直差下去。
//
// 實際症狀（Dong 2026-09-01 回報）：**人在提示頁時，紅點先亮了，提示卻要再等
// 好幾秒才解鎖**——那是兩個不同的鬧鐘在響。
//
// 對齊的重點不是「整數倍」有什麼魔力，是它讓每個計時器**參照同一個外部基準
// （牆上時鐘），而不是各自的起點**。起點是私有的、彼此不知道；牆上時鐘是共有的。
// 只要大家都對同一個東西報時，就不需要互相協調。
//
// ## 為什麼還要聽 visibilitychange
//
// 對齊只發生在掛載那一次。而分頁進背景時瀏覽器會**節流計時器**（Chrome 大約壓到
// 每秒一次，隱藏久了更會壓到每分鐘），兩個計時器被節流的程度未必一樣，相位就跑掉了
// ——**回到前景並不會自己修好**，它們會就這樣繼續錯下去。
//
// 這在這個專案不是假設性的：戶外實境遊戲，玩家會鎖螢幕、開地圖、拍照、講電話。
//
// 所以回到前景時重設一次：立刻算一次（玩家解鎖螢幕就看得到該出現的提示，不用再等
// 最多一個 tick），然後重新對齊。
//
// 節流本身不會算錯——判斷是拿兩個絕對時間相減，計時器就算一分鐘才跳一次，
// 跳的那一下仍然會把所有該解鎖的一次解開。節流只延後「發現」，不弄壞「答案」。
//
// ## 為什麼收一個 resyncKey
//
// 心跳每 10 秒才跳一次，而 `now` 停在**上一次**心跳的時刻。玩家剛走進一關時，
// 進關時刻是「現在」，比 `now` 還晚——於是 `進關時刻 + timer - now` 算出來是
// 負的，`timer=0`（進關就解鎖）那一則會被判成「還沒到」，要等下一次心跳。
//
// 實測（2026-09-06）：翻過關卡說明頁之後計時確實啟動了，但導覽列的紅點沒亮，
// **等 15 秒後才亮**。對填 3 分鐘的提示來說晚 10 秒沒人看得出來，但 validator
// 明文說「填 0 代表進關就解鎖」，那句話就有 10 秒是假的。
//
// 所以進關時刻一變就立刻重算一次——跟下面 visibilitychange 的處理同一個道理：
// **有事情發生改變了「該看到什麼」，就不要讓玩家等下一格。**
const useHintTick = (resyncKey) => {
  const [now, setNow] = useState(() => Date.now());

  // 只補一次「現在幾點」，不碰計時器的相位——對齊仍然由底下那條 effect 負責。
  useEffect(() => {
    setNow(Date.now());
  }, [resyncKey]);

  useEffect(() => {
    let timeoutId;
    let intervalId;

    const start = () => {
      const toBoundary = HINT_TICK_MS - (Date.now() % HINT_TICK_MS);
      timeoutId = setTimeout(() => {
        setNow(Date.now());
        intervalId = setInterval(() => setNow(Date.now()), HINT_TICK_MS);
      }, toBoundary);
    };

    const stop = () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(Date.now()); // 先算一次，不要讓玩家等下一格
      stop();
      start(); // 再重新對齊
    };

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return now;
};

export default useHintTick;
