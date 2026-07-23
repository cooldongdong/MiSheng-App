import PropTypes from 'prop-types';
import { Box } from '@mui/material';

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

const FlowLegend = ({ clickable = false }) => (
  <Box
    sx={{
      position: 'absolute',
      right: 12,
      bottom: 12,
      bgcolor: 'rgba(255,255,255,0.94)',
      border: '1px solid #e0e0e0',
      borderRadius: 2,
      px: 1.5,
      py: 1,
      fontSize: 11.5,
      color: '#546e7a',
      boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
      pointerEvents: 'none',
      userSelect: 'none',
    }}
  >
    <Row>
      <Line color="#b0bec5" />
      依順序
    </Row>
    <Row>
      <Line color="#78909c" dash="6 4" />
      nextId 跳轉
    </Row>
    <Row>
      <Line color="#b2591f" />
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
          fill="#fbeceb"
          stroke="#b23c2f"
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

FlowLegend.propTypes = { clickable: PropTypes.bool };

export default FlowLegend;
