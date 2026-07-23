// flowLayout.js
// 流程圖的「幾何」——把 buildFlowGraph 的結果算成座標與連線路徑。
// 純函式、不碰 DOM，所以畫面元件（FlowMap.jsx）與 CLI 輸出腳本共用同一套版面。
//
// 佈線原則（Dong 2026-07-22 回饋）：
//   1. 線不准穿過方塊——跨層與回頭的線一律走「側邊車道」，右側走前進、左側走回頭
//   2. 直角折線 ＋ 圓角，比貝茲曲線容易判讀「這條線從哪來、往哪去」
//   3. 選項文字放在線真正經過的地方，底下墊一塊底色，不會飄到別的線上

// 低明度彩虹：色相拉開才分得出來，明度壓低才不會有「AI 感」的亮藍紫
export const MODEL_COLOR = {
  MissionStart: '#2f3e46', // 章節錨點：深墨，實心底、白字
  Talk: '#4a6fa5', // 對白：靛藍
  Quiz: '#8d5a97', // 選擇：低明度紫
  MissionAnswerInput: '#b5533c', // 作答：磚紅
  CustomValueInput: '#b07d2b', // 輸入：琥珀
  Img: '#3f7d6e', // 圖片：青綠
};

export const MODEL_TINT = {
  MissionStart: '#2f3e46', // 實心
  Talk: '#eef2f8',
  Quiz: '#f5eef7',
  MissionAnswerInput: '#fbeeea',
  CustomValueInput: '#fbf3e3',
  Img: '#eaf4f1',
};

export const NODE_W = 216;
export const NODE_H = 60;
const GAP_X = 56;
const GAP_Y = 64;
const PAD = 32;
const LANE_GAP = 22; // 側邊車道間距
const R = 8; // 折角圓角

// 把折點串成帶圓角的路徑
const polyline = (pts) => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const inLen = Math.hypot(cx - px, cy - py);
    const outLen = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(R, inLen / 2, outLen / 2);
    const i1 = [cx - ((cx - px) / (inLen || 1)) * r, cy - ((cy - py) / (inLen || 1)) * r];
    const o1 = [cx + ((nx - cx) / (outLen || 1)) * r, cy + ((ny - cy) / (outLen || 1)) * r];
    d += ` L ${i1[0]} ${i1[1]} Q ${cx} ${cy} ${o1[0]} ${o1[1]}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
};

// 量字寬：中日韓字元約等於字級，西文與數字約 0.55 倍
const CJK = /[\u2e80-\u9fff\uff00-\uffef\u3000-\u303f]/;
export const textWidth = (text, size) =>
  [...String(text ?? '')].reduce(
    (w, ch) => w + (CJK.test(ch) ? size : size * 0.55),
    0
  );

// 截到塞得進 maxW 為止（塞不下才加省略號）——用字數截會爆框，因為中英文寬度不同
export const fitText = (text, maxW, size) => {
  const str = String(text ?? '');
  if (textWidth(str, size) <= maxW) return str;
  const ellipsis = textWidth('…', size);
  let w = 0;
  let out = '';
  for (const ch of str) {
    const cw = CJK.test(ch) ? size : size * 0.55;
    if (w + cw + ellipsis > maxW) break;
    out += ch;
    w += cw;
  }
  return `${out}…`;
};

export const edgeLabel = (label) => fitText(label, 96, 11);
export const labelBoxWidth = (label) => textWidth(edgeLabel(label), 11) + 16;

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

  // 側邊車道：右側給「跨層前進」、左側給「回頭跳」，各自避免重疊
  const rightLanes = [];
  const leftLanes = [];
  const takeLane = (lanes, y1, y2) => {
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    for (let i = 0; i < lanes.length; i += 1) {
      if (lanes[i].every((iv) => bottom < iv[0] - 8 || top > iv[1] + 8)) {
        lanes[i].push([top, bottom]);
        return i;
      }
    }
    lanes.push([[top, bottom]]);
    return lanes.length - 1;
  };

  const edges = [];
  // 短邊先排，長邊後排，車道編號才會由內而外
  const ordered = [...graph.edges].sort((a, b) => {
    const da = Math.abs((pos.get(a.to)?.depth ?? 0) - (pos.get(a.from)?.depth ?? 0));
    const db = Math.abs((pos.get(b.to)?.depth ?? 0) - (pos.get(b.from)?.depth ?? 0));
    return da - db;
  });

  for (const e of ordered) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;

    const x1 = a.x + NODE_W / 2;
    const y1 = a.y + NODE_H;
    const x2 = b.x + NODE_W / 2;
    const y2 = b.y;
    const span = b.depth - a.depth;

    let pts;
    let labelX;
    let labelY;

    if (span === 1) {
      // 相鄰層：直下，或在層間走一段水平（一律走在方塊之間的空白帶）
      const midY = y1 + (y2 - y1) / 2;
      pts = x1 === x2 ? [[x1, y1], [x2, y2]] : [[x1, y1], [x1, midY], [x2, midY], [x2, y2]];
      labelX = (x1 + x2) / 2;
      labelY = midY - 6;
    } else {
      // 跨層或回頭：走側邊車道，絕不穿過方塊
      const forward = span > 1;
      const lane = forward
        ? takeLane(rightLanes, y1, y2)
        : takeLane(leftLanes, y1, y2);
      const laneX = forward
        ? maxX + 28 + lane * LANE_GAP
        : minX - 28 - lane * LANE_GAP;
      const outY = y1 + 20;
      const inY = y2 - 20;
      pts = [
        [x1, y1],
        [x1, outY],
        [laneX, outY],
        [laneX, inY],
        [x2, inY],
        [x2, y2],
      ];
      labelX = laneX;
      labelY = (outY + inY) / 2;
    }

    edges.push({
      ...e,
      d: polyline(pts),
      labelX,
      labelY,
      labelAnchor: span === 1 ? 'middle' : 'middle',
      back: span <= 0,
    });
  }

  // 選項標籤若彼此疊到，沿著線往下挪開（同一題的兩個選項最容易撞）
  const labelled = edges.filter((e) => e.label);
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    for (let i = 0; i < labelled.length; i += 1) {
      for (let j = i + 1; j < labelled.length; j += 1) {
        const a = labelled[i];
        const b = labelled[j];
        const aw = labelBoxWidth(a.label) / 2;
        const bw = labelBoxWidth(b.label) / 2;
        if (
          Math.abs(a.labelX - b.labelX) < aw + bw + 4 &&
          Math.abs(a.labelY - b.labelY) < 20
        ) {
          b.labelY += 22;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // 車道會把圖撐寬，邊界要重算
  const laneRight = rightLanes.length ? maxX + 28 + (rightLanes.length - 1) * LANE_GAP + 16 : maxX;
  const laneLeft = leftLanes.length ? minX - 28 - (leftLanes.length - 1) * LANE_GAP - 16 : minX;

  return {
    nodes: [...pos.values()],
    edges,
    minX: laneLeft - PAD,
    width: laneRight - laneLeft + PAD * 2,
    height: maxY + PAD,
    // 節點自己的水平範圍（不含兩側車道）——預設視角要對齊「方塊」而不是
    // 「含車道的整張圖」，否則畫面會被空的車道區拉偏
    nodeCenterX: (minX + maxX) / 2,
    nodeWidth: maxX - minX,
  };
};

// 節點上的字（依實際寬度截，右上角的 id 要留位置）
export const nodeTitle = (n) =>
  fitText(
    [
      n.model + (n.merged > 1 ? ` ×${n.merged}` : ''),
      n.missionId && n.missionId !== '0' ? `關卡 ${n.missionId}` : '',
    ]
      .filter(Boolean)
      .join('　·　'),
    NODE_W - 32 - 46,
    11
  );

// MissionStart 這種「章節起點」列本身沒有對白，顯示關卡名稱才有意義
export const nodeSubtitle = (n, missionTitles = null) => {
  const missionName =
    n.model === 'MissionStart' && missionTitles?.[n.missionId]
      ? missionTitles[n.missionId]
      : null;
  const body =
    missionName ||
    (n.speaker ? `${n.speaker}：` : '') + (n.text || `第 ${n.id} 列`);
  return fitText(body, NODE_W - 32, 12.5);
};

