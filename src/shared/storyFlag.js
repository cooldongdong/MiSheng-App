import { normId } from './rowKey.js';

// rundown.story＝「這一列要不要在關卡解完之後收進故事頁」。
//
// **住在 shared，因為播放器與 validator 必須用同一把尺。** 兩邊各寫一份的話，
// 某天有人在一邊多收一個「O」，validator 就會對一個播放器其實看得懂的值報錯
// ——跟 isBlank 當初從 validator 私有函式搬到 rowKey 是同一課（2026-09-12）。

// 會讀這一欄的 model。其他 model 填了不會有任何效果，validator 會提醒。
//
// **Img 讀 backgroundImg、Article 讀 text**——都是它們在流程裡本來就在讀的欄位，
// 故事頁不另外要求任何東西。
export const STORY_MODELS = ['Article', 'Img'];

// 這是 repo 第一個「是／否」欄位，所以這裡訂的就是之後的慣例。
//
// **推薦的寫法是 Google Sheet 的核取方塊**，它匯出成 TRUE／FALSE。
// ⇒ **不能寫成「有填東西就算」**：沒勾的格子匯出的是 FALSE，不是空白，
//    那樣會把沒勾的全部收進去。
//
// 打字的人也要照顧到（Y、是……），但**兩邊都不是的值不猜**：回傳 null，
// 播放器當作不收、validator 提醒。打錯字（ture）最壞的結果是少收一篇，
// 而且會被講出來——猜錯的話是把不該給的內容提前放上故事頁。
const YES = new Set(['true', 'y', 'yes', '1', '是', 'v']);
const NO = new Set(['', 'false', 'n', 'no', '0', '否']);

// true＝收、false＝不收、null＝看不懂
export const parseStoryFlag = (value) => {
  const v = String(value ?? '').trim().toLowerCase();
  if (YES.has(v)) return true;
  if (NO.has(v)) return false;
  return null;
};

// 把 rundown 裡要收進故事頁的列找出來，並標上它屬於哪一關。
//
// **所屬關卡＝有填 missionId 就照填的；空白＝沿用上一關。** 這跟播放器走流程時
// 判斷「現在在哪一關」是同一條語意（game-provider 的「missionId 空白＝沿用上一關」，
// demo 有 481 列對白這樣寫），所以創作者不用多學一條規則。
//
// **已知會歸錯的情況**：流程用 nextId 跳著走，試算表的上下順序跟玩家走的順序
// 不一樣。播放器是照「玩家走過的路」判斷，這裡只能照表格順序。
// 接受這個落差（2026-09-24 與 Dong 定案）：一般遊戲照表格順序走，
// 出事時在那一列補填 missionId 就蓋過去了。
//
// GameStart 之後歸零——封面不屬於任何一關，跟播放器一樣。
//
// resolveMissionId(value) → 對得到關卡就回傳它的 id，對不到回傳 null
// （0 算不算真關卡、id 的正規化，由呼叫端決定）。
export const storyRowsOf = (rundownRows, resolveMissionId) => {
  const result = [];
  let missionId = null;
  (rundownRows || []).forEach((row, index) => {
    if (!row) return;
    const model = normId(row.model);
    if (model === 'GameStart') {
      missionId = null;
      return;
    }
    const own = resolveMissionId(row.missionId);
    if (own !== null && own !== undefined) missionId = own;
    if (!STORY_MODELS.includes(model)) return;
    if (parseStoryFlag(row.story) !== true) return;
    result.push({ row, index, missionId });
  });
  return result;
};
