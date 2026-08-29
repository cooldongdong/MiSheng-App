import { Box, Stack, Typography } from '@mui/material';
import KeyboardArrowUpRounded from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import PropTypes from 'prop-types';

// 上下拉的時候露出來的那一塊（上下滑翻頁）。
//
// 兩種內容、同一塊地方：走得過去就講「下一頁是什麼」，走不過去就講「為什麼不能過去」。
// 不必是兩套機制——玩家拉開的動作只有一個，答案就該出現在同一個位置。
//
// **只給型態，不給內容**（Dong 2026-08-28 拍板）。短影片預覽下一則，是為了讓你決定要不
// 要繼續看；解謎的下一頁是劇情，提前露出等於破梗。玩家拉一半看到下一頁寫著「原來兇手
// 是……」再放手彈回，這一頁的懸念就沒了。所以這裡給的是**方位感**（還有沒有下一頁、
// 它是哪一種頁面），不是內容。
//
// 顏色一律寫死，不吃會隨深淺模式變的 token。這一塊坐在故事畫面上，而故事畫面在兩種模式
// 下是同一個樣子（見 theme.js 的 DIALOGUE 註解）——吃 text.primary 會在其中一種模式裡
// 消失，那個錯這個專案已經犯過兩次。
const SURFACE = '#2b373d'; // 比 dialogue.surface(#37474F) 再深一階：像是壓在底下的另一張卡
const INK = 'rgba(255,255,255,0.92)';
const INK_MUTED = 'rgba(255,255,255,0.5)';
const RUST = '#e08a4a'; // 深底上讀得清楚的鏽橘（深色模式的 secondary）

const PeekPanel = ({ dir, label, detail, blocked = false }) => {
  // 卡片要貼著「跟現在這一頁相鄰的那一邊」，手指才一拉開就看得到。
  // 往上拉時這一塊在下方，內容就靠上；往下拉時反過來。
  const Arrow = dir === 'up' ? KeyboardArrowUpRounded : KeyboardArrowDownRounded;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: SURFACE,
        boxSizing: 'border-box',
        px: '7%',
        // 上下 16px：加上箭頭(24)與標題(約 20)剛好落在 64px 內，也就是「拉到會翻頁的
        // 那個門檻時，字已經讀得到」。說明文字晚一點才露出來是刻意的——先給結論，
        // 拉更多才給理由。
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: dir === 'up' ? 'flex-start' : 'flex-end',
        alignItems: 'center',
        // 拉開的時候不該讓人以為這塊是可以點的
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Stack spacing={0.5} alignItems="center" sx={{ textAlign: 'center' }}>
        <Arrow sx={{ color: blocked ? RUST : INK_MUTED, fontSize: 24 }} />
        <Typography
          variant="subtitle2"
          sx={{ color: blocked ? RUST : INK, fontWeight: 600, letterSpacing: 0.5 }}
        >
          {label}
        </Typography>
        {detail && (
          <Typography variant="caption" sx={{ color: INK_MUTED }}>
            {detail}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

PeekPanel.propTypes = {
  dir: PropTypes.oneOf(['up', 'down']).isRequired,
  label: PropTypes.string.isRequired,
  detail: PropTypes.string,
  blocked: PropTypes.bool,
};

export default PeekPanel;
