import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import DriveFolderUploadRoundedIcon from '@mui/icons-material/DriveFolderUploadRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ValidationReport from './ValidationReport';

// 試玩時的左側面板：這份遊戲從哪來、驗證結果如何、要換資料就地換。
// 就是原本 /create 那頁的資訊，收進側邊欄——載入完之後它不該再佔著主畫面。
const SourcePanel = ({ source, issues, onPickFolder, onReload, canReload }) => {
  const errors = issues.filter((it) => it.level === 'error').length;
  const warns = issues.filter((it) => it.level === 'warn').length;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100dvh',
        borderRight: '1px solid #e0e0e0',
        bgcolor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        pt: '44px', // 讓開右上角固定按鈕那一列
      }}
    >
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Typography variant="overline" sx={{ color: '#90a4ae', letterSpacing: 1 }}>
          遊戲資料
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
          <FolderRoundedIcon fontSize="small" sx={{ color: '#90a4ae', mt: 0.25 }} />
          <Typography variant="body2" sx={{ color: '#37474f', lineHeight: 1.5 }}>
            {source || '未命名'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          {errors > 0 && <Chip size="small" color="error" label={`${errors} 個錯誤`} />}
          {warns > 0 && <Chip size="small" variant="outlined" label={`${warns} 個提醒`} />}
          {errors === 0 && warns === 0 && (
            <Chip size="small" color="success" variant="outlined" label="檢查通過" />
          )}
        </Stack>

        {/* 就地換資料：不用退回開始畫面 */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            component="label"
            startIcon={<DriveFolderUploadRoundedIcon />}
          >
            換資料夾
            <input
              hidden
              type="file"
              webkitdirectory=""
              multiple
              onChange={(e) => onPickFolder(e.target.files)}
            />
          </Button>
          {canReload && (
            <Button
              size="small"
              variant="outlined"
              onClick={onReload}
              startIcon={<RefreshRoundedIcon />}
              sx={{ flexShrink: 0 }}
            >
              重新讀取
            </Button>
          )}
        </Stack>
      </Box>

      <Divider />

      {/* 報告預設收起來，只留一行摘要——268px 寬攤開會擠成一團 */}
      <Box sx={{ overflow: 'auto', flex: 1 }}>
        <Accordion
          elevation={0}
          disableGutters
          defaultExpanded={errors > 0}
          sx={{ bgcolor: 'transparent' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
            <Typography variant="body2" sx={{ color: '#546e7a' }}>
              檢查報告
              {issues.length > 0 ? `（${issues.length} 項）` : '（無問題）'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {issues.length > 0 ? (
              <ValidationReport issues={issues} />
            ) : (
              <Typography variant="caption" sx={{ color: '#90a4ae' }}>
                沒有發現任何問題。
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

SourcePanel.propTypes = {
  source: PropTypes.string,
  issues: PropTypes.array.isRequired,
  onPickFolder: PropTypes.func.isRequired,
  onReload: PropTypes.func,
  canReload: PropTypes.bool,
};

export default SourcePanel;
