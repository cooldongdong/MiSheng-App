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
  edgeLabel,
  labelBoxWidth,
  MODEL_COLOR,
  MODEL_TINT,
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

const EDGE_COLOR = { option: '#7c3aed', jump: '#0ea5e9', seq: '#cbd5e1' };

const edgeSvg = view.edges
  .map((e) => {
    const line = `  <path d="${e.d}" fill="none" stroke="${EDGE_COLOR[e.type] || '#cbd5e1'}" stroke-width="${
      e.type === 'seq' ? 1.5 : 1.8
    }"${e.type === 'jump' ? ' stroke-dasharray="6 4"' : ''} marker-end="url(#fm-arrow)"/>`;
    if (!e.label) return line;
    const w = labelBoxWidth(e.label);
    return `${line}
  <rect x="${e.labelX - w / 2}" y="${e.labelY - 9}" width="${w}" height="18" rx="9" fill="#fff" stroke="#e9d5ff"/>
  <text x="${e.labelX}" y="${e.labelY + 4}" font-size="11" fill="#7c3aed" text-anchor="middle">${esc(edgeLabel(e.label))}</text>`;
  })
  .join('\n');

const nodeSvg = view.nodes
  .map((n) => {
    const color = MODEL_COLOR[n.model] || '#64748b';
    const tint = MODEL_TINT[n.model] || '#f8fafc';
    const bad = !n.reachable;
    return `  <g>
    <rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="10" fill="${
      bad ? '#fef2f2' : tint
    }" stroke="${bad ? '#dc2626' : '#e2e8f0'}" stroke-width="${bad ? 1.6 : 1}"${
      bad ? ' stroke-dasharray="6 4"' : ''
    }/>
    <rect x="${n.x}" y="${n.y + 10}" width="3" height="${NODE_H - 20}" rx="1.5" fill="${color}"/>
    <text x="${n.x + 16}" y="${n.y + 24}" font-size="11" fill="${color}">${esc(nodeTitle(n))}</text>
    <text x="${n.x + 16}" y="${n.y + 44}" font-size="12.5" fill="#0f172a">${esc(nodeSubtitle(n))}</text>
    <text x="${n.x + NODE_W - 12}" y="${n.y + 24}" font-size="10" fill="#94a3b8" text-anchor="end">${esc(
      n.merged > 1 ? `${n.id}–${n.lastId}` : n.id
    )}</text>
  </g>`;
  })
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${view.width}" height="${view.height}" viewBox="${view.minX} 0 ${view.width} ${view.height}" font-family="system-ui, -apple-system, 'Noto Sans TC', sans-serif">
  <rect x="${view.minX}" y="0" width="${view.width}" height="${view.height}" fill="#f8fafc"/>
  <defs>
    <marker id="fm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8"/>
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
