// 一列要用哪一張底圖。**三個 model 共用同一個答案**（Talk／Quiz／CustomValueInput）。
//
// 三層，由近到遠：
//
//   1. 這一列自己填的 `backgroundImg`
//   2. 這一關（mission）的 `backgroundImg`
//   3. **玩家還不在任何關卡裡時**，用封面的底圖（config）
//
// 第 3 層是 2026-09-14 補的，而它補的是一個**改 GameStart 時斷掉的繼承**：
// 封面原本是 mission 表裡 id=0 的那一列假關卡，序章對白的 missionId 指著它，
// 於是第 2 層就把封面的底圖接下去了。改成 `GameStart` model 之後封面資料改由
// config 供應，那一列假關卡不再存在——序章對白因此不屬於任何關卡，
// 第 2 層落空，背景整個消失（Dong 回報：「原本 missionStart0 過了、可以往後繼承
// backgroundImg 的功能就沒了」）。
//
// **為什麼第 3 層要綁「不在任何關卡裡」，而不是無條件 fallback 到 config。**
// 無條件的話，第五關某一列忘了填背景也會冒出封面圖——那是一個看起來像刻意安排、
// 實際上是漏填的畫面，而且沒有任何跡象告訴創作者。綁在「還沒進任何關卡」上，
// 它的語意就很窄也很清楚：**那一段本來就是開場，視覺上屬於封面。**
// 進了關卡之後沒填就是沒填，維持原本的行為。
export const resolveBackground = (row, mission, config) =>
  row?.backgroundImg || mission?.backgroundImg || (mission ? '' : config?.backgroundImg) || '';
