import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  InputAdornment,
  List,
  ListItemButton,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

// 大綱／搜尋：流程很長時用來快速定位，不必一路拖過去
//   - 沒輸入關鍵字：列出 MissionStart（＝關卡起點），當章節目錄用
//   - 有輸入關鍵字：全表搜尋（對白、講者、id、model 都比對）
const FlowOutline = ({ nodes, activeId, onPick, missionTitles = null }) => {
  const [q, setQ] = useState('');
  const { palette } = useTheme();

  const items = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return nodes.filter((n) => n.model === 'MissionStart');
    return nodes
      .filter((n) =>
        [n.text, n.speaker, n.id, n.model, n.missionId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(key))
      )
      .slice(0, 200);
  }, [nodes, q]);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋對白、講者、id"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{ px: 1.5, pt: 1, pb: 0.5, color: 'text.disabled' }}
      >
        {q.trim() ? `找到 ${items.length} 個` : `關卡 ${items.length} 個`}
      </Typography>

      <List dense sx={{ overflow: 'auto', flex: 1, py: 0 }}>
        {items.map((n) => (
          <ListItemButton
            key={n.id}
            selected={n.id === activeId}
            onClick={() => onPick(n.id)}
            sx={{
              alignItems: 'flex-start',
              borderLeft: '3px solid',
              borderColor: palette.model.color[n.model] || palette.canvas.fallback,
              py: 0.75,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', display: 'block', lineHeight: 1.4 }}
              >
                {n.missionId && n.missionId !== '0'
                  ? `關卡 ${n.missionId}`
                  : n.model}
                {'\u3000'}#{n.merged > 1 ? `${n.id}–${n.lastId}` : n.id}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {missionTitles?.[n.missionId] ||
                  (n.speaker ? `${n.speaker}：` : '') + (n.text || `第 ${n.id} 列`)}
              </Typography>
            </Box>
          </ListItemButton>
        ))}
        {items.length === 0 && (
          <Typography variant="body2" sx={{ px: 1.5, py: 2, color: 'text.disabled' }}>
            沒有符合的內容
          </Typography>
        )}
      </List>
    </Box>
  );
};

FlowOutline.propTypes = {
  nodes: PropTypes.array.isRequired,
  activeId: PropTypes.string,
  onPick: PropTypes.func.isRequired,
  missionTitles: PropTypes.object,
};

export default FlowOutline;
