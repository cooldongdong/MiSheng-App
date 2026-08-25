import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DriveFolderUploadRoundedIcon from '@mui/icons-material/DriveFolderUploadRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import IconButton from '@mui/material/IconButton';
import { timeAgo } from './recentSheets';

const TEMPLATE_URL =
  'https://docs.google.com/spreadsheets/d/16U8l6eeu7BaWwH3TOf09T40FkHmVKJepNWtA9pjBQfU/edit';

// 開始畫面：只留一個主要動作（把資料夾丟進來），其餘全部收起來。
// 說明文字第一眼只給一行，想知道細節的人自己展開——不要一次倒完所有資訊。
const SourcePicker = ({ loading, onFolder, onSheet, error, recent = [], onForget }) => {
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);

  // 拖一個資料夾進來就開始——現代 web app 該有的手感
  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const entries = [...e.dataTransfer.items]
      .map((it) => it.webkitGetAsEntry?.())
      .filter(Boolean);
    if (!entries.length) return;

    const files = [];
    const walk = async (entry, path) => {
      if (entry.isFile) {
        const file = await new Promise((res) => entry.file(res));
        Object.defineProperty(file, 'webkitRelativePath', {
          value: `${path}${entry.name}`,
        });
        files.push(file);
        return;
      }
      const reader = entry.createReader();
      const kids = await new Promise((res) => reader.readEntries(res));
      for (const kid of kids) await walk(kid, `${path}${entry.name}/`);
    };
    for (const entry of entries) await walk(entry, '');
    onFolder(files);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#263238' }}>
          即時轉化
        </Typography>
        <Typography variant="body1" sx={{ color: '#607d8b', mt: 1, mb: 4 }}>
          把遊戲資料夾丟進來，當場檢查、當場試玩。
        </Typography>

        {/* 主要動作：拖放區 */}
        <Box
          component="label"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 6,
            px: 3,
            border: '2px dashed',
            borderColor: dragging ? '#37474f' : '#cfd8dc',
            borderRadius: 3,
            bgcolor: dragging ? '#eceff1' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 160ms ease',
            '&:hover': { borderColor: '#90a4ae', bgcolor: '#f5f7f8' },
          }}
        >
          {loading ? (
            <CircularProgress size={28} />
          ) : (
            <DriveFolderUploadRoundedIcon sx={{ fontSize: 40, color: '#90a4ae' }} />
          )}
          <Typography variant="subtitle1" sx={{ color: '#37474f', fontWeight: 600 }}>
            {loading ? '讀取中…' : '把遊戲資料夾拖進來'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#90a4ae' }}>
            或點這裡選擇資料夾
          </Typography>
          <input
            hidden
            type="file"
            webkitdirectory=""
            multiple
            onChange={(e) => onFolder(e.target.files)}
          />
        </Box>

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          justifyContent="center"
          sx={{ mt: 1.5 }}
        >
          <LockRoundedIcon sx={{ fontSize: 14, color: '#90a4ae' }} />
          <Typography variant="caption" sx={{ color: '#90a4ae' }}>
            檔案只在你的瀏覽器裡讀取，不會上傳
          </Typography>
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* 最近用過的試算表：放在主要動作之後、其他來源之前。
            它不是「另一種來源」，是同一種來源的捷徑——每次都去翻連結很煩 */}
        {recent.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <HistoryRoundedIcon fontSize="small" sx={{ color: '#90a4ae' }} />
              <Typography variant="body2" sx={{ color: '#546e7a' }}>
                最近用過
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              {recent.map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.75,
                    border: '1px solid #eceff1',
                    '&:hover': { bgcolor: '#f5f7f8' },
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    disabled={loading}
                    onClick={() => onSheet(item.id)}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      p: 0,
                      cursor: loading ? 'default' : 'pointer',
                      font: 'inherit',
                    }}
                  >
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ color: '#37474f', fontWeight: 500 }}
                    >
                      {item.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#90a4ae', flexShrink: 0 }}>
                    {timeAgo(item.at)}
                  </Typography>
                  {/* 逐筆刪得掉：共用電腦上，別人開過哪幾份試算表不該留在畫面上 */}
                  <IconButton
                    size="small"
                    aria-label={`從清單移除 ${item.title}`}
                    onClick={() => onForget(item.id)}
                    sx={{ color: '#b0bec5', flexShrink: 0 }}
                  >
                    <CloseRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {/* 次要：其他來源與說明，預設收起來 */}
        <Box sx={{ mt: 3 }}>
          <Accordion elevation={0} disableGutters sx={{ bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LinkRoundedIcon fontSize="small" sx={{ color: '#90a4ae' }} />
                <Typography variant="body2" sx={{ color: '#546e7a' }}>
                  改用 Google 試算表連結
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url) onSheet(url);
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={() => onSheet(url)}
                  disabled={!url || loading}
                >
                  檢查
                </Button>
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: '#90a4ae', display: 'block', mt: 1 }}
              >
                試算表要「共用給知道連結的任何人」；這條路的圖片欄位要填圖片網址。
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion elevation={0} disableGutters sx={{ bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 0 }}>
              <Typography variant="body2" sx={{ color: '#546e7a' }}>
                資料要怎麼準備？
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography
                variant="body2"
                component="ol"
                sx={{ pl: 2, m: 0, color: '#546e7a', lineHeight: 1.9 }}
              >
                <li>
                  從{' '}
                  <Link href={TEMPLATE_URL} target="_blank" rel="noreferrer">
                    謎生範本
                  </Link>{' '}
                  複製一份，保留 7 個分頁名稱。
                </li>
                <li>7 張表匯出成 CSV，跟圖片放進同一個資料夾（圖片可放 img/）。</li>
                <li>圖片欄位照舊填檔名，程式會在資料夾裡找。</li>
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion elevation={0} disableGutters sx={{ bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 0 }}>
              <Typography variant="body2" sx={{ color: '#546e7a' }}>
                為什麼瀏覽器會問「要上傳嗎」？
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="body2" sx={{ color: '#546e7a', lineHeight: 1.8 }}>
                那是瀏覽器對「讀取資料夾」的固定說法，我們改不了它的用字。謎生沒有
                伺服器可以收檔案，全部都在你的瀏覽器裡讀完就結束——
                你可以<strong>關掉網路</strong>再操作一次，功能一樣正常。
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </Box>
  );
};

SourcePicker.propTypes = {
  loading: PropTypes.bool,
  onFolder: PropTypes.func.isRequired,
  onSheet: PropTypes.func.isRequired,
  recent: PropTypes.array,
  onForget: PropTypes.func,
  error: PropTypes.string,
};

export default SourcePicker;
