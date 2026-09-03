import { useCallback } from 'react';
import { nextIdOf } from './useNextId';
import { keyOf, normId } from '../../shared/rowKey';

// 「上一步是哪一列」——照流程圖上看到的位置走，不是照走過的路。
//
// 為什麼是這個定義（Dong 2026-08-27 回饋）：畫面上並排著一張流程圖時，方向鍵的
// 語意就被那張圖決定了。用滑鼠從 a 跳到 c 之後按 ↑，眼睛看著圖的人期待的是 b
// （圖上 c 上面那一顆），不是 a。「回到剛才那一頁」還在，只是換到 Backspace。
//
// 圖上的垂直位置是 flowGraph 用最長路徑分層算的，所以「圖上的上一個」＝
// **流程上的上一步**（誰會走到我），不是「表上的上一列」。而那個關係在 rundown
// 資料上就算得出來——它就是 nextIdOf 的反函數，不必讓遊戲去依賴流程圖的佈局。
const prevIdOf = (data, currentId) => {
  if (!Array.isArray(data) || !currentId) return null;
  const here = data.findIndex((row) => keyOf(row) === currentId);
  if (here < 0) return null;

  const candidates = [];
  data.forEach((row, index) => {
    if (keyOf(row) === currentId) return;
    if (nextIdOf(data, row, index) !== currentId) return;

    // Quiz 的選項在圖上是線上的標籤，不是方塊——選項那一列不是一個「頁面」，
    // 停在它身上畫面會是空的。往上再跳一層到題目，才對得上圖。
    if (normId(row.parentId)) {
      const parent = data.findIndex((item) => keyOf(item) === normId(row.parentId));
      if (parent >= 0) candidates.push(parent);
      return;
    }
    candidates.push(index);
  });

  // 匯合點會有好幾個前驅（demo 裡的「回頭跳」就是）。取排在這一列之前、位置最接近
  // 的那一個＝畫面上看起來的正上方。回頭跳進來的線都排在後面，不會被選中——退一步
  // 卻往下跳，那跟「上」這個字說的是相反的事。
  const before = candidates.filter((index) => index < here);
  if (before.length === 0) return null;
  return keyOf(data[Math.max(...before)]) ?? null;
};

const usePrevId = (data, currentId) => {
  const getPrevId = useCallback(() => prevIdOf(data, currentId), [data, currentId]);
  const canGoPrev = useCallback(() => !!getPrevId(), [getPrevId]);
  return { getPrevId, canGoPrev };
};

export default usePrevId;
export { prevIdOf };
