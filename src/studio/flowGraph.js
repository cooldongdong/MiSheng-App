// **副檔名不能省。** Vite 補得出來，Node 的 ESM 解析器不會——而 scripts/flowmap.js
// 是純 Node CLI，少了 .js 它在載入這個檔的當下就 ERR_MODULE_NOT_FOUND。
// 同一個 import 在瀏覽器是好的，所以壞掉的只有命令列那條路，沒有人會看到。
import { keyOf } from '../shared/rowKey.js';

// flowGraph.js
// 從 rundown 建出「流程圖」的資料結構——純函式，不碰畫面。
//
// 流程語意（跟 useNextId／QuizModel 對齊）：
//   - 有 nextId → 跳到該 id
//   - 沒有 nextId → 走「物理的下一列」（物理順序＝流程順序）
//   - Quiz 的選項是 parentId 指向題目的那幾列：它們**不是流程節點**，
//     而是題目節點的出邊（邊上的字＝選項的 title，目的地＝選項的 nextId）
//
// 順帶做掉 validator v2 層 6 的一部分：走不到的列、迴圈、斷掉的 nextId。

const isEmpty = (v) => v === undefined || v === null || String(v).trim() === '';
const norm = (v) => String(v ?? '').trim();

// 這些 model 是流程的骨架，不摺疊；其餘（Talk/Img…）連續段會被摺成一個節點
const STRUCTURAL = new Set([
  'GameStart',
  'MissionStart',
  'Quiz',
  'MissionAnswerInput',
  'CustomValueInput',
]);

export const buildFlowGraph = (rundownRows = [], { collapse = true } = {}) => {
  // **不再濾掉「沒有 id 的列」。** id 可以留空之後（COO-136），那個過濾會讓
  // 流程圖上大部分節點直接消失——而它們是流程的一部分，只是沒有名字而已。
  // 身分改用 keyOf（有名字用名字，沒名字用物理列號），見 shared/rowKey。
  const rows = rundownRows.filter((r) => r && typeof r === 'object');

  // 選項列（有 parentId）不是流程節點，先分開
  const steps = rows.filter((r) => isEmpty(r.parentId));
  const options = rows.filter((r) => !isEmpty(r.parentId));

  const stepIndex = new Map(steps.map((r, i) => [keyOf(r), i]));
  const optionsOf = new Map();
  for (const opt of options) {
    const key = norm(opt.parentId);
    if (!optionsOf.has(key)) optionsOf.set(key, []);
    optionsOf.get(key).push(opt);
  }

  const broken = []; // nextId 指到不存在的 id
  const edges = [];

  const addEdge = (from, to, type, label) => {
    if (isEmpty(to)) return;
    const target = norm(to);
    if (!stepIndex.has(target)) {
      broken.push({ from, to: target, label });
      return;
    }
    edges.push({ from, to: target, type, label });
  };

  steps.forEach((row, i) => {
    const id = keyOf(row);
    const model = norm(row.model);
    const opts = optionsOf.get(id) || [];

    if (!isEmpty(row.nextId)) {
      addEdge(id, row.nextId, 'jump');
      return;
    }
    if (model === 'Quiz' && opts.length) {
      // 每個選項一條出邊，邊上標選項文字
      for (const opt of opts) addEdge(id, opt.nextId, 'option', norm(opt.title));
      return;
    }
    const next = steps[i + 1];
    if (next) addEdge(id, keyOf(next), 'seq');
  });

  // ---- 節點 ----
  const nodes = steps.map((row, i) => ({
    id: keyOf(row),
    order: i,
    model: norm(row.model) || '(空白)',
    missionId: norm(row.missionId),
    speaker: norm(row.speaker),
    text: norm(row.text) || norm(row.title),
    optionCount: (optionsOf.get(keyOf(row)) || []).length,
    merged: 1, // 摺疊後代表幾列
  }));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const outOf = new Map();
  const inCount = new Map();
  for (const e of edges) {
    if (!outOf.has(e.from)) outOf.set(e.from, []);
    outOf.get(e.from).push(e);
    inCount.set(e.to, (inCount.get(e.to) || 0) + 1);
  }

  const startId = nodes[0]?.id ?? null;

  // ---- 可達性 ＋ 迴圈 ----
  const reachable = new Set();
  const cycles = [];
  if (startId) {
    const stack = [startId];
    const onPath = new Set();
    const seen = new Set();
    // 迭代版 DFS，順便抓回邊
    const walk = (id) => {
      if (onPath.has(id)) {
        cycles.push(id);
        return;
      }
      if (seen.has(id)) return;
      seen.add(id);
      onPath.add(id);
      for (const e of outOf.get(id) || []) walk(e.to);
      onPath.delete(id);
    };
    walk(startId);
    for (const id of seen) reachable.add(id);
    stack.length = 0;
  }

  // ---- 摺疊連續的線性段（一進一出、非結構性 model）----
  let display = nodes;
  let displayEdges = edges;

  if (collapse) {
    const mergedInto = new Map(); // 原 id → 代表節點 id
    const kept = [];

    const canMerge = (n) => {
      if (STRUCTURAL.has(n.model)) return false;
      const outs = outOf.get(n.id) || [];
      return outs.length <= 1;
    };

    let i = 0;
    while (i < nodes.length) {
      const head = nodes[i];
      if (!canMerge(head)) {
        kept.push({ ...head });
        mergedInto.set(head.id, head.id);
        i += 1;
        continue;
      }

      // 往後吃：下一個節點必須是「這個節點的唯一 seq 去向」且只有一個入邊
      const group = [head];
      let j = i;
      for (;;) {
        const cur = nodes[j];
        const outs = outOf.get(cur.id) || [];
        if (outs.length !== 1 || outs[0].type !== 'seq') break;
        const nxt = byId.get(outs[0].to);
        if (!nxt || !canMerge(nxt)) break;
        if ((inCount.get(nxt.id) || 0) !== 1) break;
        if (nxt.order !== cur.order + 1) break;
        group.push(nxt);
        j = nodes.indexOf(nxt);
      }

      const rep = {
        ...head,
        merged: group.length,
        speakers: [...new Set(group.map((g) => g.speaker).filter(Boolean))],
        lastId: group[group.length - 1].id,
      };
      kept.push(rep);
      for (const g of group) mergedInto.set(g.id, head.id);
      i += group.length;
    }

    const keptIds = new Set(kept.map((n) => n.id));
    const seenEdge = new Set();
    displayEdges = [];
    for (const e of edges) {
      const from = mergedInto.get(e.from) ?? e.from;
      const to = mergedInto.get(e.to) ?? e.to;
      if (from === to) continue; // 段內的邊被吃掉了
      if (!keptIds.has(from) || !keptIds.has(to)) continue;
      const key = `${from}→${to}|${e.label || ''}`;
      if (seenEdge.has(key)) continue;
      seenEdge.add(key);
      displayEdges.push({ ...e, from, to });
    }
    display = kept;
  }

  // ---- 分層（最長路徑；有迴圈時靠 visited 保護）----
  const depth = new Map();
  const outDisplay = new Map();
  for (const e of displayEdges) {
    if (!outDisplay.has(e.from)) outDisplay.set(e.from, []);
    outDisplay.get(e.from).push(e);
  }

  const assign = (id, d, guard) => {
    if (guard.has(id)) return;
    if ((depth.get(id) ?? -1) >= d) return;
    depth.set(id, d);
    guard.add(id);
    for (const e of outDisplay.get(id) || []) assign(e.to, d + 1, guard);
    guard.delete(id);
  };
  if (display[0]) assign(display[0].id, 0, new Set());
  // 走不到的節點各自從自己開始排，才不會全擠在第 0 層
  for (const n of display) if (!depth.has(n.id)) assign(n.id, 0, new Set());

  const byDepth = new Map();
  for (const n of display) {
    const d = depth.get(n.id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d).push(n);
  }

  const laid = [];
  for (const [d, list] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    list
      .sort((a, b) => a.order - b.order)
      .forEach((n, col) => {
        laid.push({
          ...n,
          depth: d,
          col,
          colCount: list.length,
          reachable: reachable.has(n.id),
        });
      });
  }

  return {
    nodes: laid,
    edges: displayEdges,
    broken,
    cycles: [...new Set(cycles)],
    unreachable: laid.filter((n) => !n.reachable).map((n) => n.id),
    totalRows: steps.length,
    optionRows: options.length,
  };
};
