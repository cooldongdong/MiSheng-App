// flowmap.js
// 把一個遊戲的 rundown 畫成流程圖 SVG（CLI 版，跟 /create 的流程圖共用同一套版面）。
//
// 用法：node scripts/flowmap.js <遊戲資料夾路徑> [輸出.svg] [--expand]
//   例：node scripts/flowmap.js src/gameFile/demo demo-flow.svg

import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { buildFlowGraph } from '../src/studio/flowGraph.js';
import { withRowKeys } from '../src/shared/rowKey.js';
import {
  layoutFlow,
  nodeTitle,
  nodeSubtitle,
  edgeLabel,
  labelBoxWidth,
  NODE_W,
  NODE_H,
} from '../src/studio/flowLayout.js';
// 色票住在 shared/，它零 import——所以這支 CLI 不會被拖進 MUI
import {
  MODEL_COLOR,
  MODEL_TINT,
  EDGE_COLOR,
  FLOW_PALETTE as P,
} from '../src/shared/flowPalette.js';

const gameDir = process.argv[2];
const outPath = process.argv[3] || 'flow.svg';
const collapse = !process.argv.includes('--expand');

if (!gameDir || !fs.existsSync(gameDir)) {
  console.error('用法：node scripts/flowmap.js <遊戲資料夾路徑> [輸出.svg] [--expand]');
  process.exit(2);
}

const folderName = path.basename(gameDir);
const csvPath = path.join(gameDir, `${folderName} - rundown.csv`);
if (!fs.existsSync(csvPath)) {
  console.error(`❌ 找不到 ${csvPath}`);
  process.exit(2);
}

// **withRowKeys 不能省。** 這是第四條 CSV 解析路徑（/create、/demo、獨立播放器是
// 另外三條），而 2026-09-04「id 可以留空」那輪只補到前三條——這一條沒有人發現，
// 因為上面那個副檔名的 bug 讓這支 CLI 從那時起就載入即失敗，根本跑不到這裡。
//
// 少了它，沒填 id 的列 keyOf 會退回空字串，**所有無名列在圖眼裡是同一個節點**。
// demo 看不出來（它每一列都有 id），只有照新寫法留空 id 的遊戲會中。
const rows = withRowKeys(
  Papa.parse(fs.readFileSync(csvPath, 'utf8'), {
    header: true,
    skipEmptyLines: false,
  }).data
);

const graph = buildFlowGraph(rows, { collapse });
const view = layoutFlow(graph);

const esc = (s) =>
  String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);


const edgeSvg = view.edges
  .map((e) => {
    const line = `  <path d="${e.d}" fill="none" stroke="${EDGE_COLOR[e.type] || P.fallback}" stroke-width="${
      e.type === 'seq' ? 1.5 : 1.8
    }"${e.type === 'jump' ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#fm-arrow)"/>`;
    if (!e.label) return line;
    const w = labelBoxWidth(e.label);
    return `${line}
  <rect x="${e.labelX - w / 2}" y="${e.labelY - 9}" width="${w}" height="18" rx="9" fill="${P.surface}" stroke="${EDGE_COLOR[e.type] || P.dot}" stroke-opacity="0.45"/>
  <text x="${e.labelX}" y="${e.labelY + 4}" font-size="11" fill="${EDGE_COLOR[e.type] || P.ink}" text-anchor="middle">${esc(edgeLabel(e.label))}</text>`;
  })
  .join('\n');

const nodeSvg = view.nodes
  .map((n) => {
    const color = MODEL_COLOR[n.model] || P.fallback;
    const tint = MODEL_TINT[n.model] || P.fallbackTint;
    const bad = !n.reachable;
    return `  <g>
    <rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="10" fill="${
      bad ? P.dangerSurface : tint
    }" stroke="${bad ? P.dangerMain : P.dot}" stroke-width="${bad ? 1.6 : 1}"${
      bad ? ' stroke-dasharray="6 4"' : ''
    }/>
    <rect x="${n.x}" y="${n.y + 10}" width="3" height="${NODE_H - 20}" rx="1.5" fill="${color}"/>
    <text x="${n.x + 16}" y="${n.y + 24}" font-size="11" fill="${color}">${esc(nodeTitle(n))}</text>
    <text x="${n.x + 16}" y="${n.y + 44}" font-size="12.5" fill="${P.ink}">${esc(nodeSubtitle(n))}</text>
    <text x="${n.x + NODE_W - 12}" y="${n.y + 24}" font-size="10" fill="${P.sub}" text-anchor="end">${esc(
      n.merged > 1 ? `${n.id}–${n.lastId}` : n.id
    )}</text>
  </g>`;
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" viewBox="${view.minX} 0 ${view.width} ${view.height}" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif">
  <rect x="${view.minX}" y="0" width="${view.width}" height="${view.height}" fill="${P.canvas}"/>
  <defs>
    <marker id="fm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 0 L 8 4 L 0 8 z" fill="${P.sub}"/>
    </marker>
  </defs>
${edgeSvg}
${nodeSvg}
</svg>
`;

fs.writeFileSync(outPath, svg);

console.log(`🗺  ${folderName}：${graph.totalRows} 列 → ${graph.nodes.length} 個節點${collapse ? '（已摺疊連續對白）' : ''}`);
console.log(`   選項列 ${graph.optionRows}、走不到 ${graph.unreachable.length}、回頭跳 ${graph.cycles.length}、斷鏈 ${graph.broken.length}`);
if (graph.unreachable.length) console.log(`   走不到的 id：${graph.unreachable.slice(0, 10).join('、')}`);
if (graph.cycles.length) console.log(`   回頭跳的目的地：${graph.cycles.slice(0, 10).join('、')}`);
console.log(`   已輸出：${outPath}`);
