import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Chip,
  Fade,
  IconButton,
  Slide,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ViewSidebarRoundedIcon from '@mui/icons-material/ViewSidebarRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import GameShell from '../component/GameShell';
import { loadGameFromSheet } from '../game/sheetLoader';
import { validateGame } from '../validator/validateGame';
import { checkSheetImages } from './checkSheetImages';
import { readLocalGameFolder } from './localFiles';
import ValidationReport from './ValidationReport';
import SourcePicker from './SourcePicker';
import SourcePanel from './SourcePanel';
import FlowPanel from './FlowPanel';

// 即時轉化（/create）：資料進來 → 驗證 → 當場試玩
//
// 三個畫面狀態：
//   idle/loading —— 只有一個動作：把遊戲資料夾丟進來（SourcePicker）
//   checked      —— 檢查結果 ＋ 開始試玩
//   playing      —— 左：資料來源與驗證報告／中：遊戲／右：流程圖
//
// 定位是「免費的一次性私人預覽」：重整就消失、不留存檔、不產生可分享網址
const CreateApp = () => {
  const [status, setStatus] = useState('idle'); // idle | loading | checked | playing
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [gameData, setGameData] = useState(null);
  const [imgMap, setImgMap] = useState(null);
  const [source, setSource] = useState('');
  const [rundownRows, setRundownRows] = useState([]);

  const [showSource, setShowSource] = useState(true); // 左側面板
  const [showFlow, setShowFlow] = useState(true); // 右側流程圖

  const revokeImgs = useRef(null);

  // 表單頁要能捲；試玩時是固定一屏的版面，要鎖住捲動
  useEffect(() => {
    document.body.style.overflow = status === 'playing' ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [status]);

  useEffect(() => () => revokeImgs.current?.(), []);

  const runChecks = (tables, csvFiles, map) => {
    setRundownRows(tables.rundown?.rows || []);
    setIssues([...validateGame(tables), ...checkSheetImages(tables, map)]);
    setGameData(csvFiles);
    setStatus('checked');
  };

  const handleSheet = async (url) => {
    setStatus('loading');
    setError('');
    try {
      const { csvFiles, tables } = await loadGameFromSheet(url);
      revokeImgs.current?.();
      revokeImgs.current = null;
      setImgMap(null);
      setSource('Google 試算表');
      runChecks(tables, csvFiles, null);
    } catch (err) {
      setError(err.message || '匯入失敗');
      setStatus('idle');
    }
  };

  const handleFolder = async (files) => {
    if (!files?.length) return;
    setStatus('loading');
    setError('');
    try {
      const {
        csvFiles,
        tables,
        ignored,
        imgMap: map,
        revokeImgs: revoke,
        imgCount,
        folderName,
      } = await readLocalGameFolder(files);

      revokeImgs.current?.();
      revokeImgs.current = revoke;
      setImgMap(map);
      setSource(
        `${folderName}：${Object.keys(csvFiles).length} 張表 ＋ ${imgCount} 張圖`
      );
      if (ignored.length) {
        setError(
          `這些 CSV 的檔名認不出是哪一張表，已略過：${ignored.join('、')}`
        );
      }
      runChecks(tables, csvFiles, map);
    } catch (err) {
      setError(err.message || '讀取失敗');
      setStatus('idle');
    }
  };

  const reset = () => {
    setStatus('idle');
    setGameData(null);
    setIssues([]);
    setError('');
  };

  const hasError = issues.some((it) => it.level === 'error');

  // ---- 試玩中：三欄 ----
  if (status === 'playing' && gameData) {
    const beside = showFlow && rundownRows.length > 0;

    return (
      <>
        <GameShell
          gameData={gameData}
          previewMode
          imgMap={imgMap}
          leftPanel={
            <Slide direction="right" in={showSource} mountOnEnter unmountOnExit appear>
              <Box>
                <SourcePanel source={source} issues={issues} onReset={reset} />
              </Box>
            </Slide>
          }
          sideFlex={beside ? 1 : undefined}
          resizable={beside}
          sidePanel={beside ? <FlowPanel rundownRows={rundownRows} /> : null}
        />

        {/* 固定右上角：兩側面板的開關，位置不隨面板收合而變 */}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: 'fixed',
            top: 6,
            right: 10,
            zIndex: 2000,
            bgcolor: 'rgba(255,255,255,0.94)',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            px: 0.5,
          }}
        >
          <Tooltip title={showSource ? '收起資料來源' : '顯示資料來源'}>
            <IconButton size="small" onClick={() => setShowSource((v) => !v)}>
              <Box
                component="img"
                src="/MiSheng-logo-w.svg"
                alt="資料來源"
                sx={{
                  width: 20,
                  height: 20,
                  filter: showSource ? 'invert(0.2)' : 'invert(0.6)',
                }}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title={beside ? '收起流程圖' : '並排流程圖'}>
            <IconButton size="small" onClick={() => setShowFlow((v) => !v)}>
              <ViewSidebarRoundedIcon
                fontSize="small"
                color={beside ? 'primary' : 'inherit'}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      </>
    );
  }

  // ---- 檢查結果 ----
  if (status === 'checked') {
    return (
      <Fade in>
        <Box
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 560 }}>
            <Typography variant="overline" sx={{ color: '#90a4ae', letterSpacing: 1 }}>
              檢查結果
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#263238', mb: 0.5 }}>
              {source}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 2.5, mt: 1.5 }}>
              <Chip
                size="small"
                color={hasError ? 'error' : 'success'}
                variant={hasError ? 'filled' : 'outlined'}
                label={hasError ? '需要修正' : '可以生成'}
              />
              <Chip size="small" variant="outlined" label={`${rundownRows.length} 列流程`} />
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<PlayArrowRoundedIcon />}
                disabled={hasError}
                onClick={() => setStatus('playing')}
              >
                {hasError ? '請先修正錯誤' : '開始試玩'}
              </Button>
              <Button size="large" variant="text" onClick={reset}>
                換一份
              </Button>
            </Stack>

            <Box sx={{ mt: 3, maxHeight: '46vh', overflow: 'auto' }}>
              <ValidationReport issues={issues} />
            </Box>
          </Box>
        </Box>
      </Fade>
    );
  }

  // ---- 開始畫面 ----
  return (
    <SourcePicker
      loading={status === 'loading'}
      onFolder={handleFolder}
      onSheet={handleSheet}
      error={error}
    />
  );
};

export default CreateApp;
