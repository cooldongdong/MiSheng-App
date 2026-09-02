import { useEffect, useState } from 'react';
import { HINT_TICK_MS } from '../game/hintTimer';

// 讓「現在幾點」變成會自己前進的值。
//
// 提示的自動解鎖與導覽列的小紅點都要它——**沒有這個，畫面只會在別的原因觸發
// 重繪時才發現時間到了**，於是玩家盯著提示頁等，卻什麼都不會發生。
//
// **對齊到牆上時鐘的整數倍再開始跳。**
//
// 這不是為了準時，是為了讓**每一個用到這個 hook 的元件在同一刻醒來**。
// 第一版直接 setInterval，於是每個元件從自己掛載的那一刻起跳——導覽列在遊戲
// 一開始就掛載、提示頁是切過去才掛載，兩者的起跑點差多少就差多少，最多差滿
// 一個 HINT_TICK_MS。實際症狀（Dong 2026-09-01 回報）：**人在提示頁時，紅點
// 先亮了，提示卻要再等好幾秒才解鎖**——因為那是兩個不同的鬧鐘在響。
//
// 對齊之後兩邊落在同一個時間點，紅點與解鎖同時發生（於是待在提示頁時根本不會
// 看到紅點——它一亮起來的那一刻就被解鎖清掉了，那正是應該的樣子）。
const useHintTick = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let intervalId;
    const toBoundary = HINT_TICK_MS - (Date.now() % HINT_TICK_MS);
    const timeoutId = setTimeout(() => {
      setNow(Date.now());
      intervalId = setInterval(() => setNow(Date.now()), HINT_TICK_MS);
    }, toBoundary);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  return now;
};

export default useHintTick;
