import { useMemo, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import MouseRoundedIcon from '@mui/icons-material/MouseRounded';
import GestureRoundedIcon from '@mui/icons-material/GestureRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import WidthFullRoundedIcon from '@mui/icons-material/WidthFullRounded';
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
import FlowOutline from './FlowOutline';

const EDGE_COLOR = { option: '#b2591f', jump: '#78909c', seq: '#b0bec5' };

// rundown 的流程圖。白板式操作：滾輪／捏合縮放、拖曳平移。
//   activeId    ——玩家現在在哪一列（高亮並自動移到畫面中央）
//   onNodeClick ——點節點要做什麼（並排模式＝把遊戲跳到那一頁）
const FlowMap = ({
  rundownRows,
  activeId = null,
  onNodeClick = null,
  dense = false,
  missionTitles = null,
  toolbarActions = null,
}) => {
  // 預設展開全部列：Dong 的使用習慣是先看到全貌，再自己決定要不要摺疊
  const [collapse, setCollapse] = useState(false);
  const [showOutline, setShowOutline] = useState(dense);
  const {
    boxRef,
    transform,
    mode,
    toggleMode,
    zoomAt,
    fitWidth,
    centerOn,
    resetView,
    wasDragged,
    handlers,
  } = useCanvasGestures();
  const started = useRef(false);
  const [flashId, setFlashId] = useState(null); // 剛跳過去的節點，短暫閃一下
  const [smooth, setSmooth] = useState(false); // 程式移動畫面時才開轉場

  const graph = useMemo(
    () => buildFlowGraph(rundownRows, { collapse }),
    [rundownRows, collapse],
  );
  const view = useMemo(() => layoutFlow(graph), [graph]);

  // 預設視角：用看得清楚字的比例，而不是把整張圖硬縮到看得完
  //（六千像素長的流程整張塞進畫面＝每個字都糊掉，「縮到看得完」留給按鈕）
  useEffect(() => {
    // 等版面安頓（大綱欄、分隔線都會改變畫布寬度）再算視角，否則會偏掉
    const id = requestAnimationFrame(() => {
      resetView(view);
      started.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [view, resetView, showOutline]);

  // 摺疊之後，玩家所在的列可能被併進某個節點，要找出代表它的節點
  const activeNodeId = useMemo(() => {
    if (!activeId) return null;
    const exact = graph.nodes.find((n) => n.id === String(activeId));
    if (exact) return exact.id;
    const num = Number(activeId);
    const inRange = graph.nodes.find(
      (n) => n.merged > 1 && Number(n.id) <= num && num <= Number(n.lastId),
    );
    return inRange ? inRange.id : null;
  }, [activeId, graph.nodes]);

  // 玩家往前走時，把目前位置移到畫面中央
  useEffect(() => {
    if (!activeNodeId) return;
    const node = view.nodes.find((n) => n.id === activeNodeId);
    if (node)
      centerOn(
        node.x + NODE_W / 2,
        node.y + NODE_H / 2,
        started.current ? undefined : 0.6,
      );
  }, [activeNodeId, view, centerOn]);

  // 從大綱／搜尋跳過去：畫面用滑的（眼睛跟得上）＋ 到站後閃三下
  const focusWithFlash = (id) => {
    const node = view.nodes.find((n) => n.id === id);
    if (!node) return;
    setSmooth(true);
    centerOn(node.x + NODE_W / 2, node.y + NODE_H / 2, 0.8);
    setFlashId(id);
    window.setTimeout(() => setSmooth(false), 420);
    window.setTimeout(
      () => setFlashId((cur) => (cur === id ? null : cur)),
      2200,
    );
  };

  const handleNodeClick = (id) => {
    // 拖曳結束時不要誤觸成點擊
    if (!onNodeClick || wasDragged()) return;
    onNodeClick(id);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: dense ? '100dvh' : '70vh',
        mt: dense ? 0 : 2,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          height: '100%',
          border: dense ? 'none' : '1px solid #e0e0e0',
          borderLeft: dense ? '1px solid #e0e0e0' : undefined,
          borderRadius: dense ? 0 : 2,
          overflow: 'hidden',
          bgcolor: '#fafafa',
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
            // 拖曳畫布時不要把節點文字整片選起來（這是畫布不是文件）
            userSelect: 'none',
            WebkitUserSelect: 'none',
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
                <path d="M 0 0 L 8 4 L 0 8 z" fill="#90a4ae" />
              </marker>
              <pattern
                id="fm-grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="1" fill="#dfe3e6" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#fm-grid)" />

            <g
              transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
              fontFamily="system-ui, -apple-system, 'Noto Sans TC', sans-serif"
              style={{
                transition: smooth
                  ? 'transform 380ms cubic-bezier(.22,.61,.36,1)'
                  : 'none',
              }}
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
                        stroke="#cfd8dc"
                      />
                      <text
                        x={e.labelX}
                        y={e.labelY + 4}
                        fontSize="11"
                        fill="#00695c"
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
                // 章節錨點：實心深底＋白字，掃過去一眼就知道「新的一關從這裡開始」
                const anchor = n.model === 'MissionStart';
                const flashing = n.id === flashId;
                return (
                  <g
                    key={n.id}
                    onClick={() => handleNodeClick(n.id)}
                    style={onNodeClick ? { cursor: 'pointer' } : undefined}
                  >
                    {flashing && (
                      <>
                        {/* 雷達漣漪：兩圈由節點往外擴散並淡出，錯開 0.5 秒 */}
                        {[0, 0.5].map((delay) => (
                          <rect
                            key={delay}
                            x={n.x}
                            y={n.y}
                            width={NODE_W}
                            height={NODE_H}
                            rx="10"
                            fill="none"
                            stroke="#b2591f"
                            strokeWidth="3"
                          >
                            <animate
                              attributeName="x"
                              values={`${n.x};${n.x - 46}`}
                              dur="1s"
                              begin={`${delay}s`}
                              repeatCount="2"
                            />
                            <animate
                              attributeName="y"
                              values={`${n.y};${n.y - 46}`}
                              dur="1s"
                              begin={`${delay}s`}
                              repeatCount="2"
                            />
                            <animate
                              attributeName="width"
                              values={`${NODE_W};${NODE_W + 92}`}
                              dur="1s"
                              begin={`${delay}s`}
                              repeatCount="2"
                            />
                            <animate
                              attributeName="height"
                              values={`${NODE_H};${NODE_H + 92}`}
                              dur="1s"
                              begin={`${delay}s`}
                              repeatCount="2"
                            />
                            <animate
                              attributeName="rx"
                              values="10;40"
                              dur="1s"
                              begin={`${delay}s`}
                              repeatCount="2"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.9;0"
                              dur="1s"
                              begin={`${delay}s`}
                              repeatCount="2"
                            />
                          </rect>
                        ))}
                        {/* 漣漪散掉後，外框仍留著，讓人知道「就是這個」 */}
                        <rect
                          x={n.x - 5}
                          y={n.y - 5}
                          width={NODE_W + 10}
                          height={NODE_H + 10}
                          rx="14"
                          fill="none"
                          stroke="#b2591f"
                          strokeWidth="2.5"
                        />
                      </>
                    )}
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
                      fill={
                        bad
                          ? '#fbeceb'
                          : anchor
                            ? color
                            : active
                              ? '#fff'
                              : tint
                      }
                      stroke={
                        active
                          ? color
                          : bad
                            ? '#b23c2f'
                            : anchor
                              ? color
                              : '#dfe3e6'
                      }
                      strokeWidth={active ? 2 : bad ? 1.6 : 1}
                      strokeDasharray={bad ? '6 4' : undefined}
                    />
                    {!anchor && (
                      <rect
                        x={n.x}
                        y={n.y + 10}
                        width="3"
                        height={NODE_H - 20}
                        rx="1.5"
                        fill={color}
                      />
                    )}
                    <text
                      x={n.x + 16}
                      y={n.y + 24}
                      fontSize="11"
                      fill={anchor ? 'rgba(255,255,255,0.72)' : color}
                    >
                      {nodeTitle(n)}
                    </text>
                    <text
                      x={n.x + 16}
                      y={n.y + 44}
                      fontSize="12.5"
                      fill={anchor ? '#fff' : '#263238'}
                      fontWeight={anchor ? 600 : 400}
                    >
                      {nodeSubtitle(n, missionTitles)}
                    </text>
                    <text
                      x={n.x + NODE_W - 12}
                      y={n.y + 24}
                      fontSize="10"
                      fill={anchor ? 'rgba(255,255,255,0.6)' : '#90a4ae'}
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
          sx={{
            position: 'absolute',
            top: 10,
            left: 12,
            pointerEvents: 'none',
          }}
        >
          <Chip
            size="small"
            label={`${graph.nodes.length} 節點／${graph.totalRows} 列`}
            sx={{ bgcolor: 'rgba(255,255,255,0.94)' }}
          />
          {graph.unreachable.length > 0 && (
            <Chip
              size="small"
              color="error"
              label={`${graph.unreachable.length} 走不到`}
            />
          )}
          {graph.broken.length > 0 && (
            <Chip
              size="small"
              color="error"
              label={`${graph.broken.length} 條斷鏈`}
            />
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
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            px: 0.5,
          }}
        >
          <Tooltip title={collapse ? '展開全部列' : '摺疊連續對白'}>
            <IconButton size="small" onClick={() => setCollapse((v) => !v)}>
              {collapse ? (
                <UnfoldMoreRoundedIcon fontSize="small" />
              ) : (
                <UnfoldLessRoundedIcon fontSize="small" />
              )}
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
          <Tooltip title="撐滿左右">
            <IconButton size="small" onClick={() => fitWidth(view)}>
              <WidthFullRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={
              mode === 'mouse'
                ? '目前：滑鼠（滾輪縮放）→ 切成觸控板'
                : '目前：觸控板（兩指移動、⌘＋滾輪縮放）→ 切成滑鼠'
            }
          >
            <IconButton size="small" onClick={toggleMode}>
              {mode === 'mouse' ? (
                <MouseRoundedIcon fontSize="small" />
              ) : (
                <GestureRoundedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title={showOutline ? '收起大綱' : '顯示大綱／搜尋'}>
            <IconButton size="small" onClick={() => setShowOutline((v) => !v)}>
              <FormatListBulletedRoundedIcon
                fontSize="small"
                color={showOutline ? 'primary' : 'inherit'}
              />
            </IconButton>
          </Tooltip>
        </Stack>

        <FlowLegend clickable={!!onNodeClick} />
      </Box>

      {showOutline && (
        <Box
          sx={{
            width: 232,
            pt: '44px', // 讓出右上角固定按鈕的位置
            flexShrink: 0,
            borderLeft: '1px solid #e0e0e0',
            bgcolor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          {toolbarActions && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: showOutline ? 'flex-end' : 'center',
                gap: 0.5,
                px: 1,
                py: 0.75,
                borderBottom: '1px solid #eceff1',
              }}
            >
              {toolbarActions}
            </Box>
          )}
          {showOutline && (
            <FlowOutline
              nodes={graph.nodes}
              activeId={activeNodeId}
              onPick={focusWithFlash}
              missionTitles={missionTitles}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

FlowMap.propTypes = {
  rundownRows: PropTypes.array.isRequired,
  activeId: PropTypes.string,
  onNodeClick: PropTypes.func,
  dense: PropTypes.bool,
  missionTitles: PropTypes.object,
  toolbarActions: PropTypes.node,
};

export default FlowMap;
