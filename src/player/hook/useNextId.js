import { useCallback } from 'react';
import { keyOf, normId, nextNonBlank } from '../../shared/rowKey';

// 「這一列走完會去哪」的規則，抽出來給反方向（usePrevId）共用。
// 兩邊必須是同一條規則，否則會出現「往下走一步、往上走一步，回不到原地」。
export const nextIdOf = (data, row, index = null) => {
  if (!row) return null;
  // nextId 指的一定是「有名字的列」，而有名字的列 key 就等於 id（見 rowKey）
  if (normId(row.nextId)) return normId(row.nextId);
  const idx = index ?? data.findIndex((item) => keyOf(item) === keyOf(row));
  if (idx < 0) return null;
  // **跳過空白列。** 整列都空的那一種沒有 model，PageSlot 會渲染成 null——
  // 玩家翻到的是一頁什麼都沒有的畫面。CSV 檔尾多一個換行就會產生一列
  //（Papa 的 skipEmptyLines 刻意是 false，因為陣列索引就是試算表列號）。
  // 跳過的是走訪不是身分：keyOf 仍然用物理列號，所以存檔不受影響。
  return keyOf(nextNonBlank(data, idx + 1)) ?? null;
};

const useNextId = (data, currentDialogue) => {
  const getNextId = useCallback(() => {
    // 資料還沒載進來就被問「下一列是誰」——鍵盤翻頁是在 render 的最上層問的，
    // 會早於 GameController 那道「rundownData 還沒好就先顯示 Loading」的守門。
    // 這裡自己擋住，hook 才不會依賴呼叫端的呼叫順序。
    if (!Array.isArray(data)) return null;
    if (!currentDialogue) return null; // 如果 currentDialogue 是 null，返回 null

    if (normId(currentDialogue?.nextId)) {
      return normId(currentDialogue.nextId); // 如果有 nextId，返回它
    }

    // 沒有 nextId 時，取陣列中「物理的下一列」（物理順序＝流程順序），不再靠 id+1
    // → id 不必連續、不必是數字、**也不必存在**；插入／刪除對白都不用重編號
    const idx = data.findIndex((row) => keyOf(row) === keyOf(currentDialogue));
    // 跳過空白列，理由見 nextIdOf。**兩邊必須是同一條規則**——檔頭那句
    // 「否則會出現往下走一步、往上走一步回不到原地」在這裡一樣成立。
    const nextRow = idx >= 0 ? nextNonBlank(data, idx + 1) : null;
    return nextRow ? keyOf(nextRow) : null; // 返回下一列的 key 或 null
  }, [data, currentDialogue]);

  const canProceedToNext = useCallback(() => !!getNextId(), [getNextId]);

  return { getNextId, canProceedToNext };
};

export default useNextId;
