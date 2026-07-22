// flowmap.js
// 把一個遊戲的 rundown 畫成流程圖 SVG（CLI 版，跟 /create 的流程圖共用同一套版面）。
//
// 用法：node scripts/flowmap.js <遊戲資料夾路徑> [輸出.svg] [--expand]
//   例：node scripts/flowmap.js src/gameFile/demo demo-flow.svg

import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { buildFlowGraph } from '../src/create/flowGraph.js';
import {
  layoutFlow,
  nodeTitle,
  nodeSubtitle,
  MODEL_COLOR,
  NODE_W,
  NODE_H,
} from '../src/create/flowLayout.js';

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

const rows = Papa.parse(fs.readFileSync(csvPath, 'utf8'), {
  header: true,
  skipEmptyLines: false,
}).data;

const graph = buildFlowGraph(rows, { collapse });
const view = layoutFlow(graph);

const esc = (s) =>
  String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);

const EDGE_COLOR = { option: '#8e24aa', jump: '#0288d1', seq: '#b0bec5' };

const edgeSvg = view.edges
  .map(
    (e) => `  <path d="${e.d}" fill="none" stroke="${EDGE_COLOR[e.type] || '#b0bec5'}" stroke-width="${
      e.type === 'seq' ? 1.4 : 1.8
    }"${e.type === 'jump' ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#arrow)"/>${
      e.label
        ? `\n  <text x="${e.labelX}" y="${e.labelY}" font-size="11" fill="#6a1b9a" text-anchor="middle" stroke="#fafafa" stroke-width="3" paint-order="stroke">${esc(
            e.label.length > 9 ? `${e.label.slice(0, 9)}…` : e.label
          )}</text>`
        : ''
    }`
  )
  .join('\n');

const nodeSvg = view.nodes
  .map((n) => {
    const color = MODEL_COLOR[n.model] || '#607d8b';
    const bad = !n.reachable;
    return `  <g>
    <rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="8" fill="#fff" stroke="${
      bad ? '#d32f2f' : color
    }" stroke-width="${bad ? 2 : 1.2}"${bad ? ' stroke-dasharray="6 4"' : ''}/>
    <rect x="${n.x}" y="${n.y}" width="5" height="${NODE_H}" rx="2" fill="${color}"/>
    <text x="${n.x + 14}" y="${n.y + 21}" font-size="12" fill="${color}">${esc(nodeTitle(n))}</text>
    <text x="${n.x + 14}" y="${n.y + 39}" font-size="12" fill="#37474f">${esc(nodeSubtitle(n))}</text>
    <text x="${n.x + NODE_W - 10}" y="${n.y + 21}" font-size="10" fill="#90a4ae" text-anchor="end">${esc(
      n.merged > 1 ? `${n.id}–${n.lastId}` : n.id
    )}</text>
  </g>`;
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" viewBox="${view.minX} 0 ${view.width} ${view.height}" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif">
  <rect x="${view.minX}" y="0" width="${view.width}" height="${view.height}" fill="#fafafa"/>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#90a4ae"/>
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
