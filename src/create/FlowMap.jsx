import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { buildFlowGraph } from './flowGraph';
import {
  layoutFlow,
  nodeTitle,
  nodeSubtitle,
  MODEL_COLOR,
  NODE_W,
  NODE_H,
} from './flowLayout';

const EDGE_COLOR = { option: '#8e24aa', jump: '#0288d1', seq: '#b0bec5' };

// rundown 的流程圖（唯讀）：看清楚頁面之間怎麼接、哪裡走不到、哪裡有迴圈
const FlowMap = ({ rundownRows }) => {
  const [collapse, setCollapse] = useState(true);
  const [zoom, setZoom] = useState(0.7);

  const graph = useMemo(
    () => buildFlowGraph(rundownRows, { collapse }),
    [rundownRows, collapse]
  );
  const view = useMemo(() => layoutFlow(graph), [graph]);

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
        <Chip
          size="small"
          label={`${graph.nodes.length} 個節點／${graph.totalRows} 列`}
        />
        {graph.unreachable.length > 0 && (
          <Chip size="small" color="error" label={`${graph.unreachable.length} 個走不到`} />
        )}
        {graph.cycles.length > 0 && (
          <Chip size="small" color="warning" label={`${graph.cycles.length} 處回頭跳`} />
        )}
        {graph.broken.length > 0 && (
          <Chip size="small" color="error" label={`${graph.broken.length} 條斷鏈`} />
        )}
      </Stack>

      <Box
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: '70vh',
          bgcolor: '#fafafa',
        }}
      >
        <svg
          width={view.width * zoom}
          height={view.height * zoom}
          viewBox={`${view.minX} 0 ${view.width} ${view.height}`}
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#90a4ae" />
            </marker>
          </defs>

          {view.edges.map((e, i) => (
            <g key={`${e.from}-${e.to}-${i}`}>
              <path
                d={e.d}
                fill="none"
                stroke={EDGE_COLOR[e.type] || '#b0bec5'}
                strokeWidth={e.type === 'seq' ? 1.4 : 1.8}
                strokeDasharray={e.type === 'jump' ? '5 4' : undefined}
                markerEnd="url(#arrow)"
              />
              {e.label && (
                <text
                  x={e.labelX}
                  y={e.labelY}
                  fontSize="11"
                  fill="#6a1b9a"
                  textAnchor="middle"
                  stroke="#fafafa"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {e.label.length > 9 ? `${e.label.slice(0, 9)}…` : e.label}
                </text>
              )}
            </g>
          ))}

          {view.nodes.map((n) => {
            const color = MODEL_COLOR[n.model] || '#607d8b';
            const bad = !n.reachable;
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx="8"
                  fill="#fff"
                  stroke={bad ? '#d32f2f' : color}
                  strokeWidth={bad ? 2 : 1.2}
                  strokeDasharray={bad ? '6 4' : undefined}
                />
                <rect x={n.x} y={n.y} width="5" height={NODE_H} rx="2" fill={color} />
                <text x={n.x + 14} y={n.y + 21} fontSize="12" fill={color}>
                  {nodeTitle(n)}
                </text>
                <text x={n.x + 14} y={n.y + 39} fontSize="12" fill="#37474f">
                  {nodeSubtitle(n)}
                </text>
                <text
                  x={n.x + NODE_W - 10}
                  y={n.y + 21}
                  fontSize="10"
                  fill="#90a4ae"
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
        灰線＝照順序往下、藍虛線＝nextId 跳轉、紫線＝Quiz 選項（線上的字就是選項）。
        紅色虛框＝從第一列走不到的節點。
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
};

export default FlowMap;
