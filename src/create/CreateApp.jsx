import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GameShell from '../component/GameShell';
import { loadGameFromSheet } from '../game/sheetLoader';
import { validateGame } from '../validator/validateGame';
import ValidationReport from './ValidationReport';

// 即時轉化（/create）：貼一份 Google 試算表連結 → 驗證 → 當場試玩
// 定位是「免費的一次性私人預覽」：重整就消失、不留存檔、不產生可分享網址
const CreateApp = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | checked | playing
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [gameData, setGameData] = useState(null);

  const handleImport = async () => {
    setStatus('loading');
    setError('');
    setIssues([]);
    setGameData(null);

    try {
      const { csvFiles, tables } = await loadGameFromSheet(url);
      setIssues(validateGame(tables));
      setGameData(csvFiles);
      setStatus('checked');
    } catch (err) {
      setError(err.message || '匯入失敗');
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
        <GameShell gameData={gameData} previewMode />
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
          貼上你的 Google 試算表連結，當場檢查並試玩。
          這是一次性的私人預覽——重新整理就會消失，也不會產生可以分享的網址。
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Google 試算表連結"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url) handleImport();
            }}
          />
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!url || status === 'loading'}
          >
            {status === 'loading' ? '檢查中…' : '檢查'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {status === 'checked' && (
          <Box sx={{ mb: 3 }}>
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
            試算表要怎麼準備
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
            <li>右上角「共用」→ 改成「知道連結的任何人」可以檢視。</li>
            <li>
              圖片欄位填圖片網址。Google
              雲端硬碟的圖片，把檔案設成「知道連結的任何人」後直接貼分享連結即可。
            </li>
            <li>把網址列的連結複製過來，貼進上面欄位。</li>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default CreateApp;
