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

// 時間到、但還沒被解鎖的那些索引。
//
// 提示頁拿它去解鎖；導覽列拿它的長度當小紅點的數字。**小紅點會自己消失**——
// 玩家一打開提示頁，這些就被解鎖了，於是這個清單變空。不需要另外記「看過了沒」。
export const dueHintIndexes = (hints, missionStartedAt, unlockedForMission, now) => {
  if (!Array.isArray(hints) || !missionStartedAt) return [];
  const out = [];
  hints.forEach((hint, index) => {
    if (isHintUnlocked(unlockedForMission, hint, index)) return;
    const remaining = hintRemainingMs(hint, missionStartedAt, now);
    if (remaining === 0) out.push(index);
  });
  return out;
};
