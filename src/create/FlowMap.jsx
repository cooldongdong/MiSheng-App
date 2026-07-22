import { useMemo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { buildFlowGraph } from './flowGraph';
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
} from './flowLayout';

const EDGE_COLOR = { option: '#7c3aed', jump: '#0ea5e9', seq: '#cbd5e1' };
const CANVAS_BG = '#f8fafc';

// rundown 的流程圖（唯讀）：看清楚頁面之間怎麼接、哪裡走不到、哪裡回頭跳
//   activeId    ——玩家現在在哪一列（並排模式下會高亮並自動捲過去）
//   onNodeClick ——點節點要做什麼（並排模式下＝把遊戲跳到那一頁）
const FlowMap = ({ rundownRows, activeId = null, onNodeClick = null, dense = false }) => {
  const [collapse, setCollapse] = useState(true);
  const [zoom, setZoom] = useState(dense ? 0.55 : 0.7);
  const scrollRef = useRef(null);

  const graph = useMemo(
    () => buildFlowGraph(rundownRows, { collapse }),
    [rundownRows, collapse]
  );
  const view = useMemo(() => layoutFlow(graph), [graph]);

  // 摺疊之後，玩家所在的那一列可能被併進某個節點裡，要找出「代表它的節點」
  const activeNodeId = useMemo(() => {
    if (!activeId) return null;
    const rows = graph.nodes;
    const exact = rows.find((n) => n.id === String(activeId));
    if (exact) return exact.id;
    const num = Number(activeId);
    const inRange = rows.find(
      (n) => n.merged > 1 && Number(n.id) <= num && num <= Number(n.lastId)
    );
    return inRange ? inRange.id : null;
  }, [activeId, graph.nodes]);

  // 玩家往前走時，圖跟著捲到目前位置
  useEffect(() => {
    if (!activeNodeId || !scrollRef.current) return;
    const node = view.nodes.find((n) => n.id === activeNodeId);
    if (!node) return;
    const box = scrollRef.current;
    box.scrollTo({
      top: Math.max(0, node.y * zoom - box.clientHeight / 2),
      left: Math.max(0, (node.x - view.minX) * zoom - box.clientWidth / 2),
      behavior: 'smooth',
    });
  }, [activeNodeId, view, zoom]);

  return (
    <Box sx={{ mt: 2 }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 1 }}
      >
        <Button size="small" variant="outlined" onClick={() => setCollapse((v) => !v)}>
          {collapse ? '展開全部列' : '摺疊連續對白'}
        </Button>
        <Button size="small" onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}>
          縮小
        </Button>
        <Button size="small" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}>
          放大
        </Button>
        <Chip size="small" label={`${graph.nodes.length} 個節點／${graph.totalRows} 列`} />
        {graph.unreachable.length > 0 && (
          <Chip size="small" color="error" label={`${graph.unreachable.length} 個走不到`} />
        )}
        {graph.cycles.length > 0 && (
          <Chip size="small" variant="outlined" label={`${graph.cycles.length} 處回頭跳`} />
        )}
        {graph.broken.length > 0 && (
          <Chip size="small" color="error" label={`${graph.broken.length} 條斷鏈`} />
        )}
      </Stack>

      <Box
        ref={scrollRef}
        sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          overflow: 'auto',
          maxHeight: dense ? 'calc(100dvh - 108px)' : '70vh',
          height: dense ? 'calc(100dvh - 108px)' : undefined,
          bgcolor: CANVAS_BG,
        }}
      >
        <svg
          width={view.width * zoom}
          height={view.height * zoom}
          viewBox={`${view.minX} 0 ${view.width} ${view.height}`}
          fontFamily="system-ui, -apple-system, 'Noto Sans TC', sans-serif"
        >
          <defs>
            <marker
              id="fm-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8" />
            </marker>
          </defs>

          {view.edges.map((e, i) => (
            <g key={`${e.from}-${e.to}-${i}`}>
              <path
                d={e.d}
                fill="none"
                stroke={EDGE_COLOR[e.type] || '#cbd5e1'}
                strokeWidth={e.type === 'seq' ? 1.5 : 1.8}
                strokeDasharray={e.type === 'jump' ? '6 4' : undefined}
                markerEnd="url(#fm-arrow)"
              />
              {e.label && (
                <>
                  <rect
                    x={e.labelX - labelBoxWidth(e.label) / 2}
                    y={e.labelY - 9}
                    width={labelBoxWidth(e.label)}
                    height="18"
                    rx="9"
                    fill="#fff"
                    stroke="#e9d5ff"
                  />
                  <text
                    x={e.labelX}
                    y={e.labelY + 4}
                    fontSize="11"
                    fill="#7c3aed"
                    textAnchor="middle"
                  >
                    {edgeLabel(e.label)}
                  </text>
                </>
              )}
            </g>
          ))}

          {view.nodes.map((n) => {
            const color = MODEL_COLOR[n.model] || '#64748b';
            const tint = MODEL_TINT[n.model] || '#f8fafc';
            const bad = !n.reachable;
            const active = n.id === activeNodeId;
            return (
              <g
                key={n.id}
                onClick={onNodeClick ? () => onNodeClick(n.id) : undefined}
                style={onNodeClick ? { cursor: 'pointer' } : undefined}
              >
                {active && (
                  <rect
                    x={n.x - 5}
                    y={n.y - 5}
                    width={NODE_W + 10}
                    height={NODE_H + 10}
                    rx="13"
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    opacity="0.45"
                  />
                )}
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx="10"
                  fill={active ? '#fff' : bad ? '#fef2f2' : tint}
                  stroke={active ? color : bad ? '#dc2626' : '#e2e8f0'}
                  strokeWidth={active ? 2 : bad ? 1.6 : 1}
                  strokeDasharray={bad ? '6 4' : undefined}
                />
                <rect
                  x={n.x}
                  y={n.y + 10}
                  width="3"
                  height={NODE_H - 20}
                  rx="1.5"
                  fill={color}
                />
                <text x={n.x + 16} y={n.y + 24} fontSize="11" fill={color}>
                  {nodeTitle(n)}
                </text>
                <text x={n.x + 16} y={n.y + 44} fontSize="12.5" fill="#0f172a">
                  {nodeSubtitle(n)}
                </text>
                <text
                  x={n.x + NODE_W - 12}
                  y={n.y + 24}
                  fontSize="10"
                  fill="#94a3b8"
                  textAnchor="end"
                >
                  {n.merged > 1 ? `${n.id}–${n.lastId}` : n.id}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        灰線＝照順序往下、藍虛線＝nextId 跳轉、紫線＝Quiz 選項（圓框裡就是選項文字）。
        跨層與回頭的線走圖的兩側，不會壓過方塊。紅色虛框＝從第一列走不到的節點。
        {onNodeClick ? '點任一個方塊，遊戲就直接跳到那一頁。' : ''}
      </Typography>

      {graph.broken.length > 0 && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          斷鏈：
          {graph.broken.slice(0, 5).map((b) => `${b.from} → ${b.to}`).join('、')}
          {graph.broken.length > 5 ? ` 等 ${graph.broken.length} 條` : ''}
        </Typography>
      )}
    </Box>
  );
};

FlowMap.propTypes = {
  rundownRows: PropTypes.array.isRequired,
  activeId: PropTypes.string,
  onNodeClick: PropTypes.func,
  dense: PropTypes.bool,
};

export default FlowMap;
