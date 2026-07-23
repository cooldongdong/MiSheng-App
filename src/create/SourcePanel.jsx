import PropTypes from 'prop-types';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ValidationReport from './ValidationReport';

// 試玩時的左側面板：這份遊戲從哪來、驗證結果如何、要不要換一份。
// 就是原本 /create 那頁的資訊，收進側邊欄——載入完之後它不該再佔著主畫面。
const SourcePanel = ({ source, issues, onReset }) => {
  const errors = issues.filter((it) => it.level === 'error').length;
  const warns = issues.filter((it) => it.level === 'warn').length;

  return (
    <Box
      sx={{
        width: 268,
        height: '100dvh',
        flexShrink: 0,
        borderRight: '1px solid #e0e0e0',
        bgcolor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        pt: '44px', // 讓開右上角固定按鈕那一列的高度
      }}
    >
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Typography
          variant="overline"
          sx={{ color: '#90a4ae', letterSpacing: 1 }}
        >
          遊戲資料
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
          <FolderRoundedIcon fontSize="small" sx={{ color: '#90a4ae', mt: 0.25 }} />
          <Typography variant="body2" sx={{ color: '#37474f', lineHeight: 1.5 }}>
            {source || '未命名'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
          {errors > 0 && <Chip size="small" color="error" label={`${errors} 個錯誤`} />}
          {warns > 0 && <Chip size="small" variant="outlined" label={`${warns} 個提醒`} />}
          {errors === 0 && warns === 0 && (
            <Chip size="small" color="success" variant="outlined" label="檢查通過" />
          )}
        </Stack>

        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<RefreshRoundedIcon />}
          onClick={onReset}
          sx={{ mt: 2 }}
        >
          換一份資料
        </Button>
      </Box>

      <Divider />

      <Box sx={{ px: 2, py: 1.5, overflow: 'auto', flex: 1 }}>
        {issues.length > 0 ? (
          <ValidationReport issues={issues} />
        ) : (
          <Typography variant="caption" sx={{ color: '#90a4ae' }}>
            沒有發現任何問題。
          </Typography>
        )}
      </Box>
    </Box>
  );
};

SourcePanel.propTypes = {
  source: PropTypes.string,
  issues: PropTypes.array.isRequired,
  onReset: PropTypes.func.isRequired,
};

export default SourcePanel;
