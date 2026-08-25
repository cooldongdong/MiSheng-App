import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import ValidationReport from './ValidationReport';

// 試玩時的左側面板：這份遊戲從哪來、驗證結果如何、要換資料就地換。
// 就是原本 /create 那頁的資訊，收進側邊欄——載入完之後它不該再佔著主畫面。
//
// 版面分成「遊戲資料」與「圖片」兩組，每組都是「現在的來源 ＋ 它自己的動作」。
// 這兩層本來就可以各換各的（試算表出資料、本機資料夾出圖），版面要把這件事畫出來，
// 否則動作跟它對應的來源會離很遠，看不出誰配誰。
const SourcePanel = ({
  source,
  imgSource = '',
  issues,
  onPickFolder,
  onPickImageFolder,
  onReload,
  onReset,
  canReload,
  reloading = false,
  error = '',
  exportSlot = null,
}) => {
  const errors = issues.filter((it) => it.level === 'error').length;
  const warns = issues.filter((it) => it.level === 'warn').length;

  // 報告平常收著，但重讀後冒出錯誤時要自己打開。
  // 不能只靠 defaultExpanded——就地重讀時這個面板不會重新掛載，預設值只會生效一次。
  const [reportOpen, setReportOpen] = useState(errors > 0);
  useEffect(() => {
    if (errors > 0) setReportOpen(true);
  }, [issues, errors]);

  // 動作做成文字連結而不是按鈕：狀態行已經有 icon 了，動作再放一次同一顆
  // 會變成同一個圖示代表兩件事（一個是現況、一個是操作）
  const actionSx = {
    minWidth: 0,
    p: 0,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.6,
    color: '#1976d2',
    textTransform: 'none',
    '&:hover': { background: 'none', textDecoration: 'underline' },
  };
  const rowSx = { pl: '28px', mt: 0.25, alignItems: 'center' }; // 對齊狀態行的文字
  const dot = (
    <Typography component="span" sx={{ color: '#cfd8dc', fontSize: 13 }}>
      ·
    </Typography>
  );

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
        {/* ---- 遊戲資料 ---- */}
        <Typography variant="overline" sx={{ color: '#90a4ae', letterSpacing: 1 }}>
          遊戲資料
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
          <FolderRoundedIcon fontSize="small" sx={{ color: '#90a4ae', mt: 0.25 }} />
          <Typography variant="body2" sx={{ color: '#37474f', lineHeight: 1.5 }}>
            {source || '未命名'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={rowSx}>
          {/* 「重新讀取」這個角色在兩種來源下由不同機制扮演：試算表可以重抓，
              本機資料夾不行——瀏覽器沒辦法自己重讀一個資料夾，只能再選一次。
              所以它們共用同一個位置，只是名字不同 */}
          {canReload ? (
            <Button
              size="small"
              variant="text"
              onClick={onReload}
              disabled={reloading}
              sx={actionSx}
              startIcon={
                reloading ? <CircularProgress size={12} color="inherit" /> : null
              }
            >
              {reloading ? '讀取中' : '重新讀取'}
            </Button>
          ) : (
            <Button
              size="small"
              variant="text"
              component="label"
              disabled={reloading}
              sx={actionSx}
            >
              {reloading ? '讀取中' : '重新選資料夾'}
              <input
                hidden
                type="file"
                webkitdirectory=""
                multiple
                disabled={reloading}
                onChange={(e) => onPickFolder(e.target.files)}
              />
            </Button>
          )}
          {dot}
          {/* 換一份＝重來，回開始畫面。跟上面那顆不同：上面那顆是就地換資料，
              遊戲不卸載、停在哪一列不會被歸零 */}
          <Button
            size="small"
            variant="text"
            onClick={onReset}
            disabled={reloading}
            sx={actionSx}
          >
            換一份
          </Button>
        </Stack>

        {/* ---- 圖片 ---- */}
        <Typography
          variant="overline"
          sx={{ color: '#90a4ae', letterSpacing: 1, display: 'block', mt: 1.5 }}
        >
          圖片
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
          <ImageRoundedIcon fontSize="small" sx={{ color: '#90a4ae', mt: 0.25 }} />
          <Typography
            variant="body2"
            sx={{ color: imgSource ? '#37474f' : '#90a4ae', lineHeight: 1.5 }}
          >
            {imgSource || '用表格裡填的網址'}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={rowSx}>
          <Button
            size="small"
            variant="text"
            component="label"
            disabled={reloading}
            sx={actionSx}
          >
            {imgSource ? '換資料夾' : '改用本機資料夾'}
            <input
              hidden
              type="file"
              webkitdirectory=""
              multiple
              disabled={reloading}
              onChange={(e) => onPickImageFolder(e.target.files)}
            />
          </Button>
        </Stack>

        {/* 檢查結果放在兩組來源之後：它講的是「這份資料好不好」，不屬於任何一組，
            夾在中間會把來源跟它的動作切斷 */}
        <Stack direction="row" spacing={0.75} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          {errors > 0 && <Chip size="small" color="error" label={`${errors} 個錯誤`} />}
          {warns > 0 && <Chip size="small" variant="outlined" label={`${warns} 個提醒`} />}
          {errors === 0 && warns === 0 && (
            <Chip size="small" color="success" variant="outlined" label="檢查通過" />
          )}
        </Stack>

        {/* 匯出遊戲包：只有試算表來源才給（本機來源的圖已經是檔名，沒得換） */}
        {exportSlot && <Box sx={{ mt: 1.5 }}>{exportSlot}</Box>}

        {/* 讀取失敗留在原地講，手上這份遊戲照樣能繼續玩 */}
        {error && (
          <Alert severity="warning" sx={{ mt: 1.5, py: 0.25 }}>
            <Typography variant="caption">{error}</Typography>
          </Alert>
        )}
      </Box>

      <Divider />

      {/* 報告預設收起來，只留一行摘要——268px 寬攤開會擠成一團 */}
      <Box sx={{ overflow: 'auto', flex: 1 }}>
        <Accordion
          elevation={0}
          disableGutters
          expanded={reportOpen}
          onChange={(_, open) => setReportOpen(open)}
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
  imgSource: PropTypes.string,
  issues: PropTypes.array.isRequired,
  onPickFolder: PropTypes.func.isRequired,
  onPickImageFolder: PropTypes.func.isRequired,
  onReload: PropTypes.func,
  onReset: PropTypes.func.isRequired,
  canReload: PropTypes.bool,
  reloading: PropTypes.bool,
  error: PropTypes.string,
  exportSlot: PropTypes.node,
};

export default SourcePanel;
