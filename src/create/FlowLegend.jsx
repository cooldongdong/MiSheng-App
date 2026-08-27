import PropTypes from 'prop-types';
import { Box, useTheme } from '@mui/material';

// 圖例：畫在畫布右下角的小卡，用圖示講規則（原本是一大段文字，太醜）
const Line = ({ color, dash }) => (
  <svg width="26" height="10" style={{ flexShrink: 0 }}>
    <path
      d="M 1 5 L 25 5"
      stroke={color}
      strokeWidth="1.8"
      strokeDasharray={dash}
      fill="none"
    />
  </svg>
);
Line.propTypes = { color: PropTypes.string.isRequired, dash: PropTypes.string };

const Row = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, lineHeight: 1.6 }}>
    {children}
  </Box>
);
Row.propTypes = { children: PropTypes.node };

const FlowLegend = ({ clickable = false }) => {
  // 線色從 theme 拿，不再手抄一份。圖例與圖畫的是同一組常數，
  // 才不會出現「圖例說橘色、圖上是紫色」那種只有比對才發現得了的錯。
  const { palette } = useTheme();
  return (
  <Box
    sx={{
      position: 'absolute',
      right: 12,
      bottom: 12,
      bgcolor: 'background.overlay',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      px: 1.5,
      py: 1,
      fontSize: 11.5,
      color: 'text.secondary',
      boxShadow: 1,
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  >
    <Row>
      <Line color={palette.edge.seq} />
      依順序
    </Row>
    <Row>
      <Line color={palette.edge.jump} dash="6 4" />
      nextId 跳轉
    </Row>
    <Row>
      <Line color={palette.edge.option} />
      Quiz 選項
    </Row>
    <Row>
      <svg width="26" height="12" style={{ flexShrink: 0 }}>
        <rect
          x="1"
          y="1"
          width="24"
          height="10"
          rx="3"
          fill={palette.error.surface}
          stroke={palette.error.main}
          strokeDasharray="4 3"
        />
      </svg>
      走不到
    </Row>
    {clickable && (
      <Row>
        <Box sx={{ width: 26, textAlign: 'center', flexShrink: 0 }}>👆</Box>
        點方塊＝跳到那頁
      </Row>
    )}
  </Box>
  );
};

FlowLegend.propTypes = { clickable: PropTypes.bool };

export default FlowLegend;
