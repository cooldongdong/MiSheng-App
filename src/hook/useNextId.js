import { useCallback } from 'react';

const useNextId = (data, currentDialogue) => {
  const getNextId = useCallback(() => {
    if (!currentDialogue) return null; // 如果 currentDialogue 是 null，返回 null

    if (currentDialogue?.nextId) {
      return currentDialogue.nextId; // 如果有 nextId，返回它
    }

    // 沒有 nextId 時，取陣列中「物理的下一列」（物理順序＝流程順序），不再靠 id+1
    // → id 不必連續、不必是數字；插入／刪除對白也不會讓後面整串要重編號
    const idx = data.findIndex((row) => row.id === currentDialogue?.id);
    const nextRow = idx >= 0 ? data[idx + 1] : null;
    return nextRow ? nextRow.id : null; // 返回下一列的 id 或 null
  }, [data, currentDialogue]);

  const canProceedToNext = useCallback(() => !!getNextId(), [getNextId]);

  return { getNextId, canProceedToNext };
};

export default useNextId;
