// 照流程圖的「位置」走，不是照流程的「邊」走。
//
// 這是與 usePrevId 並行的第二種導覽（Dong 2026-08-27）：
//   - 流程模式：↑↓ 沿著邊，問的是「這一頁的下一步是誰」
//   - 地圖模式：↑↓←→ 照座標，問的是「圖上這個方向最近的方塊是誰」
// 兩者在直線流程上重疊，一到分支就分岔——並排的兩個 Talk 之間沒有任何邊，
// 只有地圖模式走得過去，而那正是「我想看看另一條線長什麼樣」的動作。
//
// 為什麼住在 src/create/ 而不是遊戲層：座標是流程圖才有的概念，而且節點集合要跟
// 畫面上看到的一致（摺疊是 FlowMap 的內部狀態）。遊戲層只收一個 (id, 方向) => id
// 的函式，不知道座標怎麼來的，也就不會反過來依賴流程圖的佈局。

// 節點中心在它那一層裡的相對位置。
//
// layoutFlow 把每一層置中排（x = col*(W+G) - rowWidth/2），所以層與層之間的 col
// 不能直接比——一層有 1 個、另一層有 3 個時，col 0 在畫面上不是同一個地方。
// 扣掉各自的中心才比得出「誰在誰的正上方」。單位無所謂，只要兩層用同一把尺。
const centerOf = (node) => node.col - (node.colCount - 1) / 2;

export const buildSpatialNav = (nodes) => {
  const list = (nodes || []).map((n) => ({
    id: String(n.id),
    depth: n.depth ?? 0,
    center: centerOf(n),
    col: n.col ?? 0,
  }));
  const byId = new Map(list.map((n) => [n.id, n]));
  const depths = [...new Set(list.map((n) => n.depth))].sort((a, b) => a - b);

  return (currentId, direction) => {
    const here = byId.get(String(currentId));
    if (!here) return null;

    // 左右：同一層裡的鄰居。並排的節點之間沒有邊，所以這是唯一走得過去的方式。
    if (direction === 'left' || direction === 'right') {
      const sameRow = list
        .filter((n) => n.depth === here.depth && n.id !== here.id)
        .filter((n) => (direction === 'right' ? n.col > here.col : n.col < here.col))
        .sort((a, b) => (direction === 'right' ? a.col - b.col : b.col - a.col));
      return sameRow[0]?.id ?? null;
    }

    // 上下：跳到相鄰的那一層，取水平位置最接近的一個＝看起來的正上／正下方。
    //
    // 找「下一個存在的層」而不是 depth ± 1：走不到的節點會各自從第 0 層開始排，
    // 中間可能出現空層，寫死 ±1 會在那裡卡住。
    const step = direction === 'down' ? 1 : -1;
    const candidates = depths.filter((d) =>
      step > 0 ? d > here.depth : d < here.depth
    );
    const nextDepth = step > 0 ? candidates[0] : candidates[candidates.length - 1];
    if (nextDepth === undefined) return null;

    const row = list.filter((n) => n.depth === nextDepth);
    if (row.length === 0) return null;
    return row.reduce((best, n) =>
      Math.abs(n.center - here.center) < Math.abs(best.center - here.center) ? n : best
    ).id;
  };
};

export default buildSpatialNav;
