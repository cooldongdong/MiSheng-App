// flowLayout.js
// 流程圖的「幾何」——把 buildFlowGraph 的結果算成座標與連線路徑。
// 純函式、不碰 DOM，所以畫面元件（FlowMap.jsx）與離線輸出腳本可以共用同一套版面。

export const MODEL_COLOR = {
  MissionStart: '#1565c0',
  Quiz: '#6a1b9a',
  MissionAnswerInput: '#ad1457',
  CustomValueInput: '#00695c',
  Img: '#4e342e',
  Talk: '#37474f',
};

export const NODE_W = 190;
export const NODE_H = 54;
const GAP_X = 40;
const GAP_Y = 46;
const PAD = 24;

export const layoutFlow = (graph) => {
  const pos = new Map();

  for (const n of graph.nodes) {
    const rowWidth = n.colCount * NODE_W + (n.colCount - 1) * GAP_X;
    const x = n.col * (NODE_W + GAP_X) - rowWidth / 2;
    const y = PAD + n.depth * (NODE_H + GAP_Y);
    pos.set(n.id, { ...n, x, y });
  }

  let minX = 0;
  let maxX = 0;
  let maxY = 0;
  for (const n of pos.values()) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + NODE_H);
  }

  const edges = [];
  for (const e of graph.edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;

    const x1 = a.x + NODE_W / 2;
    const y1 = a.y + NODE_H;
    const x2 = b.x + NODE_W / 2;
    const y2 = b.y;

    // 往回跳（迴圈／回頭）走側邊繞線，才不會壓在節點上
    const d =
      y2 <= y1
        ? `M ${x1} ${y1} C ${Math.max(x1, x2) + NODE_W} ${y1}, ${
            Math.max(x1, x2) + NODE_W
          } ${y2}, ${x2} ${y2 - 2}`
        : `M ${x1} ${y1} C ${x1} ${y1 + 24}, ${x2} ${y2 - 24}, ${x2} ${y2}`;

    edges.push({
      ...e,
      d,
      // 標籤放在靠近起點的 35% 處，並往目標方向偏，兩條分支的字才不會疊在一起
      labelX: x1 + (x2 - x1) * 0.55,
      labelY: y1 + (y2 - y1) * 0.38,
      back: y2 <= y1,
    });
  }

  return {
    nodes: [...pos.values()],
    edges,
    minX: minX - PAD,
    width: maxX - minX + PAD * 2,
    height: maxY + PAD,
  };
};

// 節點上的兩行字
export const nodeTitle = (n) =>
  [
    n.model + (n.merged > 1 ? ` ×${n.merged}` : ''),
    n.missionId && n.missionId !== '0' ? `關卡 ${n.missionId}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

export const nodeSubtitle = (n) => {
  const body = (n.speaker ? `${n.speaker}：` : '') + (n.text || `#${n.id}`);
  return body.length > 20 ? `${body.slice(0, 20)}…` : body;
};
