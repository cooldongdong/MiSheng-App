import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Fade,
  IconButton,
  Slide,
  Snackbar,
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
  const [sheetUrl, setSheetUrl] = useState(''); // 記住來源，才能就地重新讀取
  const [rundownRows, setRundownRows] = useState([]);
  // 試玩中重新讀取：不動 status，畫面留在三欄，只有左欄轉圈
  // （status 一旦變成 'loading' 就會掉到開始畫面那個分支，整棵遊戲樹跟著卸載）
  const [reloading, setReloading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // 換過幾份資料，給 GameController 判斷要不要重解析
  const [notice, setNotice] = useState('');

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

  // keepPlaying：在左側面板就地換資料時，不要退回檢查畫面
  const runChecks = (tables, csvFiles, map, keepPlaying) => {
    setRundownRows(tables.rundown?.rows || []);
    setIssues([...validateGame(tables), ...checkSheetImages(tables, map)]);
    setGameData(csvFiles);
    setDataVersion((v) => v + 1);
    setStatus(keepPlaying ? 'playing' : 'checked');
  };

  // 試玩中換資料轉圈；還沒開始試玩才走 status='loading'（開始畫面的轉圈）
  const beginLoad = (keepPlaying) => {
    setError('');
    if (keepPlaying) setReloading(true);
    else setStatus('loading');
  };

  // 讀取失敗時：試玩中就留在原地、錯誤顯示在左欄——手上這份還能玩的遊戲不該被一起丟掉
  const failLoad = (keepPlaying, err, fallbackMsg) => {
    setError(err.message || fallbackMsg);
    if (!keepPlaying) setStatus('idle');
  };

  const handleSheet = async (url) => {
    const keepPlaying = status === 'playing';
    beginLoad(keepPlaying);
    try {
      const { csvFiles, tables } = await loadGameFromSheet(url);
      revokeImgs.current?.();
      revokeImgs.current = null;
      setImgMap(null);
      setSheetUrl(url);
      setSource('Google 試算表');
      runChecks(tables, csvFiles, null, keepPlaying);
    } catch (err) {
      failLoad(keepPlaying, err, '匯入失敗');
    } finally {
      setReloading(false);
    }
  };

  const handleFolder = async (files) => {
    if (!files?.length) return;
    const keepPlaying = status === 'playing';
    beginLoad(keepPlaying);
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
      setSheetUrl('');
      setSource(
        `${folderName}：${Object.keys(csvFiles).length} 張表 ＋ ${imgCount} 張圖`
      );
      if (ignored.length) {
        setError(
          `這些 CSV 的檔名認不出是哪一張表，已略過：${ignored.join('、')}`
        );
      }
      runChecks(tables, csvFiles, map, keepPlaying);
    } catch (err) {
      failLoad(keepPlaying, err, '讀取失敗');
    } finally {
      setReloading(false);
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
          dataVersion={dataVersion}
          onPositionLost={() =>
            setNotice(
              '你剛才停的那一列在新資料裡找不到了（id 被改掉或刪掉），已回到開頭。'
            )
          }
          leftPanel={
            // 收起時整欄不渲染，否則會留一條空白佔著畫面
            showSource ? (
              <Slide direction="right" in mountOnEnter appear timeout={260}>
                <Box sx={{ height: '100%' }}>
                  <SourcePanel
                    source={source}
                    issues={issues}
                    onPickFolder={handleFolder}
                    onReload={() => handleSheet(sheetUrl)}
                    canReload={!!sheetUrl}
                    reloading={reloading}
                    error={error}
                  />
                </Box>
              </Slide>
            ) : null
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

        {/* 重讀後被迫回到開頭時說一聲——不講的話會像遊戲自己跳掉了 */}
        <Snackbar
          open={!!notice}
          autoHideDuration={6000}
          onClose={() => setNotice('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="info" variant="filled" onClose={() => setNotice('')}>
            {notice}
          </Alert>
        </Snackbar>
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
