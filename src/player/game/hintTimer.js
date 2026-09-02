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

// 時間到、但還沒被解鎖的那些索引。
//
// 提示頁拿它去解鎖；導覽列拿它的長度當小紅點的數字。**小紅點會自己消失**——
// 玩家一打開提示頁，這些就被解鎖了，於是這個清單變空。不需要另外記「看過了沒」。
export const dueHintIndexes = (hints, missionStartedAt, unlockedForMission, now) => {
  if (!Array.isArray(hints) || !missionStartedAt) return [];
  const out = [];
  hints.forEach((hint, index) => {
    if (unlockedForMission?.[index]) return;
    const remaining = hintRemainingMs(hint, missionStartedAt, now);
    if (remaining === 0) out.push(index);
  });
  return out;
};
