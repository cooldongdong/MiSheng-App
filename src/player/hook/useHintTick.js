import { useEffect, useState } from 'react';
import { HINT_TICK_MS } from '../game/hintTimer';

// 讓「現在幾點」變成會自己前進的值。
//
// 提示的自動解鎖與導覽列的小紅點都要它——**沒有這個，畫面只會在別的原因觸發
// 重繪時才發現時間到了**，於是玩家盯著提示頁等，卻什麼都不會發生。
const useHintTick = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), HINT_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
};

export default useHintTick;
