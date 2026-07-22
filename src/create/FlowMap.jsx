import { useMemo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded';
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
import { useCanvasGestures } from './useCanvasGestures';
import FlowLegend from './FlowLegend';

const EDGE_COLOR = { option: '#7c3aed', jump: '#0ea5e9', seq: '#cbd5e1' };

// rundown 的流程圖。白板式操作：滾輪／捏合縮放、拖曳平移。
//   activeId    ——玩家現在在哪一列（高亮並自動移到畫面中央）
//   onNodeClick ——點節點要做什麼（並排模式＝把遊戲跳到那一頁）
const FlowMap = ({ rundownRows, activeId = null, onNodeClick = null, dense = false }) => {
  const [collapse, setCollapse] = useState(true);
  const { boxRef, transform, zoomAt, fit, centerOn, resetView, wasDragged, handlers } =
    useCanvasGestures();
  const started = useRef(false);

  const graph = useMemo(
    () => buildFlowGraph(rundownRows, { collapse }),
    [rundownRows, collapse]
  );
  const view = useMemo(() => layoutFlow(graph), [graph]);

  // 預設視角：用看得清楚字的比例，而不是把整張圖硬縮到看得完
  //（六千像素長的流程整張塞進畫面＝每個字都糊掉，「縮到看得完」留給按鈕）
  useEffect(() => {
    resetView(view);
    started.current = true;
  }, [view, resetView]);

  // 摺疊之後，玩家所在的列可能被併進某個節點，要找出代表它的節點
  const activeNodeId = useMemo(() => {
    if (!activeId) return null;
    const exact = graph.nodes.find((n) => n.id === String(activeId));
    if (exact) return exact.id;
    const num = Number(activeId);
    const inRange = graph.nodes.find(
      (n) => n.merged > 1 && Number(n.id) <= num && num <= Number(n.lastId)
    );
    return inRange ? inRange.id : null;
  }, [activeId, graph.nodes]);

  // 玩家往前走時，把目前位置移到畫面中央
  useEffect(() => {
    if (!activeNodeId) return;
    const node = view.nodes.find((n) => n.id === activeNodeId);
    if (node) centerOn(node.x + NODE_W / 2, node.y + NODE_H / 2, started.current ? undefined : 0.6);
  }, [activeNodeId, view, centerOn]);

  const handleNodeClick = (id) => {
    // 拖曳結束時不要誤觸成點擊
    if (!onNodeClick || wasDragged()) return;
    onNodeClick(id);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: dense ? '100dvh' : '70vh',
        border: dense ? 'none' : '1px solid #e2e8f0',
        borderLeft: dense ? '1px solid #e2e8f0' : undefined,
        borderRadius: dense ? 0 : 2,
        overflow: 'hidden',
        bgcolor: '#f8fafc',
        mt: dense ? 0 : 2,
      }}
    >
      <Box
        ref={boxRef}
        {...handlers}
        sx={{
          position: 'absolute',
          inset: 0,
          cursor: 'grab',
          touchAction: 'none',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <svg width="100%" height="100%">
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
            <pattern id="fm-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#e2e8f0" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#fm-grid)" />

          <g
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
            fontFamily="system-ui, -apple-system, 'Noto Sans TC', sans-serif"
          >
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
                  onClick={() => handleNodeClick(n.id)}
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
          </g>
        </svg>
      </Box>

      {/* 左上：這張圖的體檢數字 */}
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ position: 'absolute', top: 10, left: 12, pointerEvents: 'none' }}
      >
        <Chip
          size="small"
          label={`${graph.nodes.length} 節點／${graph.totalRows} 列`}
          sx={{ bgcolor: 'rgba(255,255,255,0.94)' }}
        />
        {graph.unreachable.length > 0 && (
          <Chip size="small" color="error" label={`${graph.unreachable.length} 走不到`} />
        )}
        {graph.broken.length > 0 && (
          <Chip size="small" color="error" label={`${graph.broken.length} 條斷鏈`} />
        )}
        {graph.cycles.length > 0 && (
          <Chip
            size="small"
            label={`${graph.cycles.length} 回頭跳`}
            sx={{ bgcolor: 'rgba(255,255,255,0.94)' }}
          />
        )}
      </Stack>

      {/* 右上：畫布控制 */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          bgcolor: 'rgba(255,255,255,0.94)',
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          px: 0.5,
        }}
      >
        <Tooltip title={collapse ? '展開全部列' : '摺疊連續對白'}>
          <IconButton size="small" onClick={() => setCollapse((v) => !v)}>
            {collapse ? <UnfoldMoreRoundedIcon fontSize="small" /> : <UnfoldLessRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="縮小">
          <IconButton size="small" onClick={() => zoomAt(0, 0, 1 / 1.25)}>
            <RemoveRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="放大">
          <IconButton size="small" onClick={() => zoomAt(0, 0, 1.25)}>
            <AddRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="縮到看得完">
          <IconButton size="small" onClick={() => fit(view)}>
            <FitScreenRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <FlowLegend clickable={!!onNodeClick} />
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
