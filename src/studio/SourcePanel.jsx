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
  Link,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ValidationReport from './ValidationReport';
import BrandBadge from '../shared/BrandBadge';

// 試玩時的左側面板：這份遊戲從哪來、驗證結果如何、要換資料就地換。
// 就是原本 /create 那頁的資訊，收進側邊欄——載入完之後它不該再佔著主畫面。
//
// 版面分成「遊戲資料」與「圖片」兩組，每組都是「現在的來源 ＋ 它自己的動作」。
// 這兩層本來就可以各換各的（試算表出資料、本機資料夾出圖），版面要把這件事畫出來，
// 否則動作跟它對應的來源會離很遠，看不出誰配誰。
// 送一筆測試事件到創作者的 Apps Script。
//
// 用一般的 fetch 而不是 sendBeacon：beacon 是「射後不理」，連「有沒有送出去」
// 都不會告訴你，而這裡至少要能分辨「網路不通」跟「送出去了」。
// 仍然是 no-cors，所以讀不到對方的回應——能回答的只有「這個請求出去了嗎」。
const sendProbe = async (url) => {
  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        gameId: '（測試連線）',
        sid: 'connection-test',
        events: [
          {
            // 每次都用新的 id，否則第二次測試會被去重吃掉，看起來像沒送到
            id: 'test-' + Date.now(),
            ts: Date.now(),
            type: 'connection_test',
            missionId: '',
            value: '這是從 /create 送出的測試資料，可以直接刪掉',
          },
        ],
      }),
    });
    return true;
  } catch {
    return false;
  }
};

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
  recordUrl = '',
}) => {
  const errors = issues.filter((it) => it.level === 'error').length;
  const warns = issues.filter((it) => it.level === 'warn').length;

  // 報告平常收著，但重讀後冒出錯誤時要自己打開。
  // 不能只靠 defaultExpanded——就地重讀時這個面板不會重新掛載，預設值只會生效一次。
  const [reportOpen, setReportOpen] = useState(errors > 0);
  const [probe, setProbe] = useState('');
  const [probing, setProbing] = useState(false);
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
    color: 'primary.main',
    textTransform: 'none',
    '&:hover': { background: 'none', textDecoration: 'underline' },
  };
  const rowSx = { pl: '28px', mt: 0.25, alignItems: 'center' }; // 對齊狀態行的文字

  return (
    <Box
      sx={{
        width: '100%',
        height: '100dvh',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        pt: '4px',
      }}
    >
      {/* 導覽列。左上＝你在哪、怎麼出去；右上（浮在畫面上的那組）＝這一頁的控制項。
          放在左欄頂端而不是浮在遊戲上，是 Dong 2026-08-29 的決定——三欄模式下
          遊戲那一欄是要拿來看的，不該再疊東西上去。
          代價講清楚：左欄收起來時這一列會跟著不見。可以接受，因為右上角的左欄
          開關永遠在，兩步找得回來。 */}
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <BrandBadge tone="plain" size={18} />
        {/* 「回到 /create」與底下那排動作是同一個 onReset。
            它原本只長在「遊戲資料」那組底下、叫「換一份」——13px 的文字連結、
            跟「重新讀取」用一個「·」串在一起。Dong 找不到它、要求做一顆新的，
            **那件事本身就是回饋**：功能存在不等於功能被看見。
            所以這裡不是加功能，是把既有的動作搬到導覽的位置、換一個講得清楚的名字；
            舊的那顆同時拿掉——同一個動作出現兩次，人會以為它們不一樣。 */}
        <Button
          size="small"
          startIcon={<ArrowBackRoundedIcon sx={{ fontSize: 16 }} />}
          onClick={onReset}
          disabled={reloading}
          sx={{
            minWidth: 0,
            px: 0.75,
            fontSize: 13,
            fontWeight: 400,
            color: 'text.secondary',
            textTransform: 'none',
          }}
        >
          回到 /create
        </Button>
      </Stack>

      <Box sx={{ px: 2, pt: 1.5, pb: 1.5 }}>
        {/* ---- 遊戲資料 ---- */}
        <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 1 }}>
          遊戲資料
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
          <FolderRoundedIcon fontSize="small" sx={{ color: 'text.disabled', mt: 0.25 }} />
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
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
        </Stack>

        {/* ---- 圖片 ---- */}
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: 1, display: 'block', mt: 1.5 }}
        >
          圖片
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
          <ImageRoundedIcon fontSize="small" sx={{ color: 'text.disabled', mt: 0.25 }} />
          <Typography
            variant="body2"
            sx={{ color: imgSource ? 'text.primary' : 'text.disabled', lineHeight: 1.5 }}
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

      {/* ---- 玩家紀錄 ---- */}
      {/*
        **沒設定也要留一行。** 第一版做成「沒填就完全不顯示」，理由是「不打擾
        用不到的人」——但那也代表**沒有人會發現這個功能存在**（Dong 2026-09-07：
        「我沒有在 create 頁面看到那個按鈕」）。而這個功能的價值恰恰在於
        「你原本不知道自己想要」。

        所以未設定時留一行輕的說明 ＋ 一條連結，設定了才長出「測試連線」。

        **那顆鈕唯一的工作是「讓他知道通不通」。** 跨來源的回應是不透明的，
        程式讀不到成功與否，所以它不能說「成功了」——它只能說「送出去了，
        去看你的試算表」。看起來很弱，但那是唯一不會騙人的說法：
        真正的驗證是那張表上多了一列，不是這裡跳了什麼字。
      */}
      <Divider />
      <Box sx={{ px: 1.5, py: 1.25 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
          玩家紀錄
        </Typography>
        {!recordUrl && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            未設定 ·{' '}
            <Link
              // **相對網址，不要寫死 misheng.app。** 寫死的話在本機或區網測試時，
              // 這條連結會把人送去線上那份（舊的）文件——Dong 2026-09-07 撞到：
              // 「我還是無法看到最新的文件」。
              //
              // 匯出包的 README 則相反，那份文字會在創作者自己的網域下被讀到，
              // 相對網址指不到我們的站，所以那邊維持絕對網址。
              //
              // **路徑要含 publish/。** 這三條連結（這裡一條、exportGamePack 兩條）
              // 曾經全部是 404 上線的：文件站改成分章節之後真正的網址是
              // /docs/publish/collect，而 VitePress 的 ignoreDeadLinks 只檢查
              // **文件站內部**的連結——從 app 指過去的這幾條它看不到，
              // 所以沒有任何東西會在 build 時吵。改這裡時請一併 curl 一次。
              href="/docs/publish/collect"
              target="_blank"
              rel="noopener"
              underline="hover"
            >
              怎麼收集玩家的遊戲紀錄？
            </Link>
          </Typography>
        )}
        {recordUrl && (
          <>
            <Button
              size="small"
              variant="outlined"
              disabled={probing}
              onClick={async () => {
                setProbing(true);
                setProbe('');
                const ok = await sendProbe(recordUrl);
                setProbing(false);
                setProbe(
                  ok
                    ? '已送出一筆測試資料。打開你的試算表，「遊戲紀錄」最後一列應該是 connection_test。'
                    : '送不出去（網路不通，或那條網址不對）。'
                );
              }}
            >
              {probing ? '送出中…' : '測試連線'}
            </Button>
            {probe && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                {probe}
              </Typography>
            )}
          </>
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
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              檢查報告
              {issues.length > 0 ? `（${issues.length} 項）` : '（無問題）'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {issues.length > 0 ? (
              <ValidationReport issues={issues} />
            ) : (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
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
  recordUrl: PropTypes.string,
};

export default SourcePanel;
