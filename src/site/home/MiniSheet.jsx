import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { motion } from 'motion/react';
import { tint } from './tint';

// 首頁三段都在用的「試算表長相」：欄字母、列號、底部分頁籤。
// 只是長相——資料怎麼解析由各段自己決定，這裡不認得任何欄位的意思。

const TABS = ['rundown', 'character', 'mission', 'prop', 'hint', 'story', 'config'];


const cellBase = {
  px: 1,
  py: 0.75,
  borderRight: '1px solid',
  borderBottom: '1px solid',
  borderColor: 'divider',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
  position: 'relative',
  zIndex: 1,
};

const MiniSheet = ({
  id,
  columns,
  rows,
  active,
  tab = 'rundown',
  renderCell,
  cellSx,
  layoutIds = {},
  sx,
}) => {
  const template = `2.2em ${columns.map((c) => c.width || '1fr').join(' ')}`;
  return (
    <Box
      sx={{
        fontFamily: '"Noto Sans TC", sans-serif',
        fontSize: { xs: '0.72rem', sm: '0.78rem' },
        color: 'text.primary',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '14px',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: template, position: 'relative' }}>
        {/* 欄字母列 */}
        <Box sx={{ ...cellBase, gridRow: 1, gridColumn: 1, bgcolor: 'action.hover' }} />
        {columns.map((c, i) => (
          <Box
            key={c.key}
            sx={{ ...cellBase, gridRow: 1, gridColumn: i + 2, bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 600 }}
          >
            <Box component="span" sx={{ color: 'text.disabled', mr: 0.75 }}>
              {String.fromCharCode(65 + i)}
            </Box>
            {c.label ?? c.key}
          </Box>
        ))}

        {rows.map((r, ri) => {
          const isActive = r.rowNo === active;
          // 每一格都明確指定 gridRow／gridColumn：底色那塊要跟整列重疊，
          // 而 grid 只允許「明確放置」的格子互相重疊——自動排的格子會繞開它。
          const gridRow = ri + 2;
          return [
            isActive && (
              <Box
                key={`${r.rowNo}-hl`}
                component={motion.div}
                layoutId={`${id}-active-row`}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                sx={{
                  gridRow,
                  gridColumn: '1 / -1',
                  bgcolor: tint('secondary', 0.12),
                  boxShadow: (t) => `inset 3px 0 0 ${t.vars.palette.secondary.main}`,
                  pointerEvents: 'none',
                }}
              />
            ),
            <Box
              key={`${r.rowNo}-n`}
              sx={{
                ...cellBase,
                gridRow,
                gridColumn: 1,
                color: isActive ? 'secondary.main' : 'text.disabled',
                fontWeight: isActive ? 700 : 400,
                textAlign: 'center',
                px: 0,
              }}
            >
              {r.rowNo}
            </Box>,
            ...columns.map((c, ci) => (
              <Box
                key={`${r.rowNo}-${c.key}`}
                sx={{ ...cellBase, gridRow, gridColumn: ci + 2, ...(cellSx?.(r, c.key) || {}) }}
              >
                {renderCell ? (
                  renderCell(r, c.key)
                ) : (
                  <Box
                    component={motion.span}
                    layoutId={layoutIds[`${r.rowNo}.${c.key}`]}
                    sx={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}
                  >
                    {r.cells[c.key]}
                  </Box>
                )}
              </Box>
            )),
          ];
        })}
      </Box>

      {/* 分頁籤：七張表 */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          px: 1,
          py: 0.75,
          bgcolor: 'action.hover',
          overflow: 'hidden',
          fontSize: '0.72rem',
          color: 'text.secondary',
        }}
      >
        {TABS.map((t) => (
          <Box
            key={t}
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 1,
              whiteSpace: 'nowrap',
              ...(t === tab && { bgcolor: 'background.paper', color: 'text.primary', fontWeight: 700 }),
            }}
          >
            {t}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

MiniSheet.propTypes = {
  id: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.node, width: PropTypes.string })
  ).isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({ rowNo: PropTypes.number.isRequired, cells: PropTypes.object })
  ).isRequired,
  active: PropTypes.number,
  tab: PropTypes.string,
  renderCell: PropTypes.func,
  cellSx: PropTypes.func,
  layoutIds: PropTypes.object,
  sx: PropTypes.object,
};

export default MiniSheet;
