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
import { prefetchSheetGids } from './sheetLoader';

const TEMPLATE_URL =
  'https://docs.google.com/spreadsheets/d/16U8l6eeu7BaWwH3TOf09T40FkHmVKJepNWtA9pjBQfU/edit';

// 開始畫面：只留一個主要動作（把資料夾丟進來），其餘全部收起來。
// 說明文字第一眼只給一行，想知道細節的人自己展開——不要一次倒完所有資訊。
const SourcePicker = ({
  loading,
  onFolder,
  onSheet,
  error,
  recent = [],
  onForget,
  pendingSheet = '',
  onAcceptPending,
  onDismissPending,
  playMode = false,
}) => {
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
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          即時轉化
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4 }}>
          把遊戲資料夾丟進來，當場檢查、當場試玩。
        </Typography>

        {/* 別人分享過來的連結：不自動載入，先講清楚要載入什麼、由使用者按一下。
            自己書籤過的（在最近使用清單裡）不會走到這裡，會直接載入 */}
        {pendingSheet && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            {/* 同一個提示，兩種身分：作者是「要載入一份資料」，
                被分享來的人是「有人請你玩一個遊戲」。措辭不換的話，
                玩家會被要求對一句工具的話點頭。 */}
            <Typography variant="body2">
              {playMode
                ? '有人分享了一個遊戲給你'
                : '這個連結要載入一份 Google 試算表'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.5,
                color: 'text.disabled',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
              }}
            >
              {pendingSheet}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="contained"
                disableElevation
                onClick={onAcceptPending}
                disabled={loading}
              >
                {playMode ? '開始試玩' : '載入並檢查'}
              </Button>
              <Button size="small" onClick={onDismissPending} disabled={loading}>
                {playMode ? '先不要' : '不用，我自己選'}
              </Button>
            </Stack>
          </Box>
        )}

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
            borderColor: dragging ? 'text.primary' : 'divider',
            borderRadius: 3,
            bgcolor: dragging ? 'action.selected' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 160ms ease',
            '&:hover': { borderColor: 'text.disabled', bgcolor: 'action.hover' },
          }}
        >
          {loading ? (
            <CircularProgress size={28} />
          ) : (
            <DriveFolderUploadRoundedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {loading ? '讀取中…' : '把遊戲資料夾拖進來'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
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
          <LockRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
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
              <HistoryRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
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
                      sx={{ fontWeight: 500 }}
                    >
                      {item.title}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
                    {timeAgo(item.at)}
                  </Typography>
                  {/* 逐筆刪得掉：共用電腦上，別人開過哪幾份試算表不該留在畫面上 */}
                  <IconButton
                    size="small"
                    aria-label={`從清單移除 ${item.title}`}
                    onClick={() => onForget(item.id)}
                    sx={{ color: 'text.disabled', flexShrink: 0 }}
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
                <LinkRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  改用 Google 試算表連結
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Stack direction="row" spacing={1}>
                {/* 貼上／離開欄位時就先去問分頁的 gid，不等按「檢查」。
                    那趟 htmlview 要 0.7 秒，而使用者貼完之後總要把手移到按鈕上
                    ——時間本來就在那裡，只是原本沒被用掉。

                    **綁 onPaste 而不是 onChange**：逐字輸入時，打到一半的網址
                    照樣會被 parseSpreadsheetId 認成合法 id（正則只認「/d/ 後面
                    有東西」），於是每敲一個字就去問一次不存在的試算表。
                    貼上只觸發一次，而且拿到的是完整字串。
                    onBlur 補的是「真的用手打完」的那種人。

                    prefetch 失敗完全不出聲：使用者只是在打字，
                    不該因為背景那支請求而看到紅字（見 sheetLoader）。 */}
                <TextField
                  fullWidth
                  size="small"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onPaste={(e) =>
                    prefetchSheetGids(e.clipboardData?.getData('text'))
                  }
                  onBlur={() => prefetchSheetGids(url)}
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
                sx={{ color: 'text.disabled', display: 'block', mt: 1 }}
              >
                試算表要「共用給知道連結的任何人」；這條路的圖片欄位要填圖片網址。
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion elevation={0} disableGutters sx={{ bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 0 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                資料要怎麼準備？
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography
                variant="body2"
                component="ol"
                sx={{ pl: 2, m: 0, color: 'text.secondary', lineHeight: 1.9 }}
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
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                為什麼瀏覽器會問「要上傳嗎」？
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
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
  pendingSheet: PropTypes.string,
  playMode: PropTypes.bool,
  onAcceptPending: PropTypes.func,
  onDismissPending: PropTypes.func,
  error: PropTypes.string,
};

export default SourcePicker;
