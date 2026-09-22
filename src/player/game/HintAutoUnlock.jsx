import { useContext, useEffect } from 'react';
import { GameContext } from '../store/game-context';
import useHintTick from '../hook/useHintTick';
import { autoUnlockIndexes, hintKeyOf } from './hintTimer';

// 時間到的提示自動解鎖。**不畫任何東西**，只是一個掛在 provider 底下的心跳。
//
// ## 為什麼不在提示頁
//
// 原本寫在 HintPage 的 effect 裡，理由是「玩家沒在看的時候解不解鎖沒有差別」。
// 那句話對畫面成立，**對資料不成立**：GameShell 的分頁是 switch，只有當前那一頁
// 會被掛載，所以玩家站在解謎頁時 timer 到了什麼都不會發生；等他切到提示頁，
// 所有已過期的會在同一格一次解開——於是 `hint_auto_unlock` 的時間戳記的是
// 「他打開提示分頁的時刻」，填 5 分鐘與 10 分鐘的兩則會在同一秒各記一筆
//（Dong 2026-09-20 從遙測表上看出來）。
//
// 搬出來之後，timer 填幾分鐘就是第幾分鐘解鎖，誤差只有一個心跳（10 秒）。
//
// **連帶改變了 hint_auto_unlock 的語意**：它不再需要「而且他打開過提示頁」，
// 所以筆數會上升，那一欄變成「在這一關待超過 N 分鐘的人次」。卡關的直接證據
// 一直都是 hint_unlock（手動），兩者 2026-09-14 就分開記了，這裡只是讓 auto
// 那一欄變成一個乾淨的停留時間指標。
//
// ## 為什麼是一個元件，不是 provider 裡的一條 effect
//
// 心跳每 10 秒就換一次 `now`，而 **provider 的 context value 是每次 render 新生的
// 物件**——把 useHintTick 放進 provider 本體，等於讓每一個 useContext(GameContext)
// 的元件每 10 秒全部重繪一次。做成兄弟元件，重繪就只發生在這一個 return null 的
// 東西身上；真正要讓別人重繪的時候（解鎖了）本來就會透過 setUnlockedHints 發生。
//
// previewMode 的守門在 provider 的 record 裡（/create 不記事件），這裡不必再擋。
const HintAutoUnlock = () => {
  const { hintData, currentMissionId, unlockedHints, missionStartedAt, unlockHint } =
    useContext(GameContext);
  // 進關時刻一變就立刻重算，不必等下一次心跳（見 useHintTick 的說明）
  const now = useHintTick(missionStartedAt?.[currentMissionId]);

  useEffect(() => {
    if (!currentMissionId) return;
    // 只算當前這一關——跟改動前一致，而且別關的提示對玩家現在看不看得到毫無意義。
    const hints = Array.isArray(hintData)
      ? hintData.filter((row) => row.missionId === currentMissionId)
      : [];
    autoUnlockIndexes(
      hints,
      missionStartedAt?.[currentMissionId],
      unlockedHints?.[currentMissionId],
      now
    ).forEach((index) =>
      // 'auto'＝安全網開的，不是玩家開口要的。見 game-provider 的 unlockHint。
      unlockHint(currentMissionId, hintKeyOf(hints[index]), 'auto')
    );
    // unlockHint 每次 render 都是新函式，放進 deps 會讓這條 effect 每次都重跑；
    // 而它讀的東西全都在 deps 裡，不會讀到過期的值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, hintData, currentMissionId, missionStartedAt, unlockedHints]);

  return null;
};

export default HintAutoUnlock;
