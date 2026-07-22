import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GameShell from '../component/GameShell';
import { loadGameFromSheet } from '../game/sheetLoader';
import { validateGame } from '../validator/validateGame';
import { checkSheetImages } from './checkSheetImages';
import { readLocalGameFolder } from './localFiles';
import ValidationReport from './ValidationReport';

// 即時轉化（/create）：資料進來 → 驗證 → 當場試玩
// 兩條來源都支援：Google 試算表連結／本機 CSV 檔（全本機路線，什麼都不上傳）
// 圖片可選本機資料夾，表格就照舊填檔名——資料表完全不用改
// 定位是「免費的一次性私人預覽」：重整就消失、不留存檔、不產生可分享網址
const CreateApp = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | checked | playing
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [gameData, setGameData] = useState(null);

  const [imgMap, setImgMap] = useState(null);
  const [source, setSource] = useState(''); // 目前這份資料從哪來，顯示用
  const revokeImgs = useRef(null);
  const lastTables = useRef({}); // 換圖片來源時要能重驗，留住上一次的 tables

  // 表單頁要能捲（報告可能很長）；試玩時是固定一屏的遊戲畫面，要鎖住捲動
  useEffect(() => {
    document.body.style.overflow = status === 'playing' ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [status]);

  // 離開頁面時釋放 blob 網址
  useEffect(() => () => revokeImgs.current?.(), []);

  const runChecks = (tables, csvFiles, map) => {
    lastTables.current = tables;
    // 共用 validator（結構／參照／列舉值）＋ 即時轉化專屬的圖片來源檢查
    setIssues([...validateGame(tables), ...checkSheetImages(tables, map)]);
    setGameData(csvFiles);
    setStatus('checked');
  };

  const handleImportSheet = async () => {
    setStatus('loading');
    setError('');
    setIssues([]);
    setGameData(null);

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

  // 選一整個遊戲資料夾：CSV 和圖片都在裡面，使用者只做一個動作
  const handlePickGameFolder = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;

    setStatus('loading');
    setError('');
    setIssues([]);
    setGameData(null);

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
      setUrl('');
      setSource(`資料夾「${folderName}」（${imgCount} 張圖）`);

      if (ignored.length) {
        setError(
          `這些 CSV 的檔名認不出是哪一張表，已略過：${ignored.join('、')}` +
            '（檔名要是「遊戲名 - rundown.csv」或「rundown.csv」）',
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
  };

  if (status === 'playing' && gameData) {
    return (
      <>
        <GameShell gameData={gameData} previewMode imgMap={imgMap} />
        <Button
          size="small"
          variant="contained"
          color="inherit"
          onClick={reset}
          sx={{ position: 'fixed', top: 8, right: 8, zIndex: 2000 }}
        >
          換一份
        </Button>
      </>
    );
  }

  const hasError = issues.some((it) => it.level === 'error');

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#fff', width: '100%' }}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          即時轉化
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          把你的遊戲資料丟進來，當場檢查並試玩。
          這是一次性的私人預覽——重新整理就會消失，也不會產生可以分享的網址。
        </Typography>

        <Button
          variant="contained"
          component="label"
          fullWidth
          size="large"
          sx={{ py: 1.5 }}
        >
          選擇遊戲資料夾
          <input
            hidden
            type="file"
            webkitdirectory=""
            multiple
            onChange={handlePickGameFolder}
          />
        </Button>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1 }}
        >
          整個資料夾選進來就好——7 張 CSV 和圖片都在裡面，程式自己分。
          表格照舊填檔名，不用改成網址。檔案不會上傳，只留在這台電腦。
        </Typography>

        {source && (
          <Chip size="small" sx={{ mt: 1.5 }} label={`已載入：${source}`} />
        )}

        <Divider sx={{ my: 3 }}>或</Divider>

        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            label="Google 試算表連結"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url) handleImportSheet();
            }}
          />
          <Button
            variant="outlined"
            onClick={handleImportSheet}
            disabled={!url || status === 'loading'}
          >
            {status === 'loading' ? '檢查中…' : '檢查'}
          </Button>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1 }}
        >
          試算表要「共用給知道連結的任何人」。這條路的圖片欄位目前要填圖片網址。
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {status === 'checked' && (
          <Box sx={{ mt: 3, mb: 3 }}>
            <ValidationReport issues={issues} />
            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 2 }}
              disabled={hasError}
              onClick={() => setStatus('playing')}
            >
              {hasError ? '請先修正錯誤' : '開始試玩'}
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            資料要怎麼準備
          </Typography>
          <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
            <li>
              從{' '}
              <Link
                href="https://docs.google.com/spreadsheets/d/16U8l6eeu7BaWwH3TOf09T40FkHmVKJepNWtA9pjBQfU/edit"
                target="_blank"
                rel="noreferrer"
              >
                謎生範本
              </Link>{' '}
              複製一份，保留 7
              個分頁名稱：config、character、mission、rundown、hint、prop、story。
            </li>
            <li>
              把 7 張表匯出成 CSV，跟圖片放進同一個資料夾（圖片可以放 img/
              子資料夾），然後整個資料夾選進來。不用設定任何權限。
            </li>
            <li>
              圖片欄位照舊填檔名（`fengmian.jpg`），程式會在你選的資料夾裡找。
            </li>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default CreateApp;
