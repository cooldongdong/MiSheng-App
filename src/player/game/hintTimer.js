import { fingerprintOf } from '../../shared/rowKey';

// hint.timer：進這一關之後第幾分鐘，自動解鎖這一則提示。單位是分鐘，選填。
//
// 抽成共用函式而不是各算各的，是因為**有兩個地方要問同一個問題**：提示頁（要真的
// 解鎖）與底部導覽列的小紅點（要知道有沒有東西該看了）。兩邊各寫一份的話，改了
// 其中一邊、另一邊會安靜地給出不同的答案——這個 repo 已經在 models.js 上踩過一次。

// 每隔多久重算一次。10 秒足夠了：timer 的單位是分鐘，誤差最多 10 秒沒有人在意，
// 而更密的輪詢只是在戶外多耗電。
export const HINT_TICK_MS = 10000;

// 這一則的 timer 換算成毫秒。null ＝ 沒有設定。
//
// **空白與 0 是兩件事，這個區別要守住：**
//   空白 → null → 沒有自動解鎖，只能手動開（舊試算表沒有這一欄，走的就是這條）
//   0    → 0    → 進關就解鎖，玩家不必花一次手動解鎖去換
//   3    → 3 分鐘後解鎖
//
// 0 的用途是真的：有些「提示」其實是該關的前提說明（「答案在廟埕的石碑上，
// 不用進廟」），那種東西不該讓玩家付出「我承認我需要幫忙」的代價。
//
// 非數字與負數當成「沒有設定」而不是報錯——**播放器不該因為試算表填錯就壞掉**，
// 那是 validator 的工作（它會提醒）。播放器的責任是繼續能玩。
export const hintTimerMs = (hint) => {
  const raw = hint?.timer;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const minutes = Number(String(raw).trim());
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  return minutes * 60 * 1000;
};

// 還要等多久（毫秒）。null ＝ 沒設 timer，或還不知道何時進的關。
export const hintRemainingMs = (hint, missionStartedAt, now) => {
  const ms = hintTimerMs(hint);
  if (ms === null || !missionStartedAt) return null;
  return Math.max(0, missionStartedAt + ms - now);
};

// 顯示用的剩餘分鐘數。**無條件進位**：剩 10 秒也要說「1 分鐘」，
// 說「0 分鐘後解鎖」會讓人以為壞了。
export const hintRemainingMinutes = (remainingMs) =>
  remainingMs === null ? null : Math.ceil(remainingMs / 60000);

// 解鎖狀態的鍵：這一則提示的**內容**，不是它排第幾個。
//
// 原本是用索引存的（`unlockedHints[missionId][3] = true`），於是**創作者在同一關的
// 提示中間插一則，玩家已解鎖的提示會整批往下位移一格**——本來解開第 3 則，
// 變成第 4 則被解開。跟 COO-137 修的 currentId 是同一種病，只是換一張表。
//
// 前綴 `h:` 是為了跟舊存檔的數字鍵永遠分得開——指紋是 base36，理論上可能長得像
// 一個小數字，而那會讓「舊索引 3」誤判成「某一則的指紋」。
//
// **只認這三欄，不是整個物件。** 兩個理由：
//   ① 提示頁會替 hint 掛上 avatar（從 character 查來的），而導覽列的小紅點拿的是
//      原始列。整個物件算指紋的話兩邊答案不同，紅點會永遠不消失。
//   ② `timer` 刻意不算——創作者調整幾分鐘後自動解鎖，那還是同一則提示，
//      不該把玩家已經解開的鎖回去。
const HINT_IDENTITY_FIELDS = ['speaker', 'text', 'img'];
export const hintKeyOf = (hint) =>
  `h:${fingerprintOf(hint, HINT_IDENTITY_FIELDS)}`;

// 這一則解鎖了嗎。
//
// **同時認舊存檔的數字鍵**：本功能之前存的都是索引，直接改鍵會讓玩到一半的人
// 手上的提示全部鎖回去。舊鍵在插列時仍然會位移，但那是它本來就有的行為
// ——不會比以前更糟，而且解鎖一次之後就會用新鍵記下來。
export const isHintUnlocked = (unlockedForMission, hint, index) =>
  Boolean(unlockedForMission?.[hintKeyOf(hint)] || unlockedForMission?.[index]);

// 這一則的到期時刻（epoch ms）。null ＝ 沒設 timer，或還不知道何時進的關。
//
// **它是推導出來的，不存。** 進關時刻與 timer 都在手上，多存一份只會多一個
// 會跟事實不同步的地方。
export const hintDueAt = (hint, missionStartedAt) => {
  const ms = hintTimerMs(hint);
  if (ms === null || !missionStartedAt) return null;
  return missionStartedAt + ms;
};

// 時間到、但還沒被解鎖的那些索引 ＝ **現在該解鎖哪幾則**。
//
// 只有一個呼叫者：game-provider 那條每 10 秒跑一次的自動解鎖 effect。
//
// **這個問題跟「有什麼是新的」是兩件事**（後者見 freshHintIndexes）。原本兩者
// 共用同一個答案——導覽列的紅點數就是這個陣列的長度，而它會歸零是因為玩家一打開
// 提示頁，這些就被解鎖了。也就是說**通知的清除是解鎖的副作用**，兩件事被綁在一起。
//
// 綁著就沒辦法把解鎖移出提示頁，而不移出去，`hint_auto_unlock` 的時間戳記的是
// 「玩家打開提示分頁的時刻」而不是「提示到期的時刻」：填 5 分鐘與 10 分鐘的兩則，
// 在第 12 分鐘打開提示頁時會在同一秒各記一筆（Dong 2026-09-20 從遙測表上看出來）。
export const autoUnlockIndexes = (hints, missionStartedAt, unlockedForMission, now) => {
  if (!Array.isArray(hints) || !missionStartedAt) return [];
  const out = [];
  hints.forEach((hint, index) => {
    if (isHintUnlocked(unlockedForMission, hint, index)) return;
    const remaining = hintRemainingMs(hint, missionStartedAt, now);
    if (remaining === 0) out.push(index);
  });
  return out;
};

// **在玩家上次看提示頁之後才到期的**那些索引 ＝ 有什麼是新的。
//
// 導覽列的紅點與「進頁自動展開」都問這個。解鎖搬去全域之後，「到期但還沒解鎖」
// 永遠是空集合，所以通知不能再靠它——改成拿到期時刻跟 seenAt 比。
//
// **seenAt 沒有值時視為 0**（＝什麼都還沒看過）。這一格有兩種情況：玩家從來沒開過
// 提示頁，以及舊存檔還沒有這個欄位。兩者要的行為一樣——把已經到期的都當成新的，
// 也就是跟改動前一模一樣的畫面。
//
// **刻意不看解鎖狀態。** 手動解鎖過的提示不該因此變成「新的」，而它本來就不會：
// 判準只有到期時刻。反過來，時間到而玩家沒看到，就算它已經被自動解鎖了，
// 對他來說仍然是新的——那正是紅點要講的事。
export const freshHintIndexes = (hints, missionStartedAt, seenAt, now) => {
  if (!Array.isArray(hints) || !missionStartedAt) return [];
  const since = seenAt || 0;
  const out = [];
  hints.forEach((hint, index) => {
    const dueAt = hintDueAt(hint, missionStartedAt);
    if (dueAt === null) return;
    if (dueAt > since && dueAt <= now) out.push(index);
  });
  return out;
};
