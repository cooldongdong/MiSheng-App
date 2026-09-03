import PropTypes from 'prop-types';
import { Box, Skeleton, Stack, Typography, useMediaQuery } from '@mui/material';

// 檢查通過之後不再停在檢查頁，而是直接進三欄——中間就少了一個「有東西在動」的畫面。
// 讀 7 張 CSV 要幾秒，沒有這一頁的話會是一段白畫面，看起來像當掉了。
//
// 它是**蓋在畫面上的遮罩**，不是一個獨立的畫面。原因：載入畫面與三欄是兩棵完全
// 不同的樹，硬切的那一格要一次掛上三欄＋遊戲＋流程圖（demo 是 1272 個 SVG 文字
// 節點），使用者會看到半畫好的狀態閃一下。改成遮罩之後，那一格發生在遮罩底下，
// 等底下安定了才淡出。
//
// **內容是三欄的骨架，不是一顆轉圈的 logo**（2026-09-03）。
//
// 那七支 export 要 1.4 秒，是 Google 端的延遲，我們這邊砍不掉（試過 format=zip
// 一次抓完——回的是 HTML 不是 CSV，528KB、更慢；也試過跳過 307 直接打最終網址
// ——CORS 下 redirect:'manual' 只給得到 opaque 回應，讀不到 Location）。
// **速度到頂之後，剩下的槓桿是感知。** 骨架回答的是「東西要來了，長這樣」，
// 而不是進度條的「還要多久」——後者在講一段你無能為力的等待，前者在講版面。
//
// 骨架畫的是三欄。檢查沒過時去的是錯誤報告頁而不是三欄，那種情況骨架會落空；
// 但過關就直接進三欄是絕大多數的路徑，錯誤是少數，這個交換是刻意的。

// 骨架的形狀對齊 CreateApp 的三欄：左 268 ＋ 分隔線 ＋ 遊戲 420 ＋ 分隔線 ＋ 流程圖。
// 數字寫死沒關係——這是一張示意圖不是版面，差幾像素沒有人看得出來，
// 而真正的版面在遮罩底下已經照自己的規則長好了。
const NARROW = 1024;
const LEFT_W = 268;
const GAME_W = 420;

// 左欄：標題、兩顆按鈕、試玩連結、匯出
const LeftSkeleton = () => (
  <Stack spacing={1.25} sx={{ width: LEFT_W, flex: '0 0 auto', p: 2 }}>
    <Skeleton variant="text" width="45%" height={20} />
    <Skeleton variant="rounded" height={32} />
    <Skeleton variant="rounded" height={32} />
    <Box sx={{ pt: 1.5 }}>
      <Skeleton variant="text" width="35%" height={16} />
    </Box>
    <Skeleton variant="rounded" height={56} />
    <Skeleton variant="rounded" height={32} width="70%" />
    <Box sx={{ pt: 2 }}>
      <Skeleton variant="text" width="40%" height={16} />
    </Box>
    <Skeleton variant="rounded" height={80} />
  </Stack>
);

// 中間：手機框。上面一條標頭、一塊大圖、幾行字，底下五顆分頁圖示
const GameSkeleton = ({ title }) => (
  <Box
    sx={{
      width: '100%',
      maxWidth: GAME_W,
      flex: '1 1 auto',
      display: 'flex',
      flexDirection: 'column',
      p: 2,
      gap: 1.5,
      minWidth: 0,
    }}
  >
    <Skeleton variant="rounded" height={28} />
    {/* 大圖佔掉大部分高度，跟真的遊戲首頁一樣 */}
    <Skeleton variant="rounded" sx={{ flex: '1 1 auto', minHeight: 120 }} />
    {/* 知道遊戲叫什麼就寫出來——骨架配一個真名字，讀起來是
        「你的工作區正在回來」，而不是「有個東西在載」。
        名字來自 recentSheets（上一次成功載入時存的），不用多打一支請求。
        別人分享來的連結查不到，那時就只有骨架，這是對的：
        那份試算表本來就不是他的東西。 */}
    {title ? (
      <Typography variant="h6" noWrap sx={{ opacity: 0.55 }}>
        {title}
      </Typography>
    ) : (
      <Skeleton variant="text" width="55%" height={28} />
    )}
    <Skeleton variant="text" width="100%" height={14} />
    <Skeleton variant="text" width="88%" height={14} />
    <Stack direction="row" spacing={2} justifyContent="center" sx={{ pt: 1 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} variant="circular" width={22} height={22} />
      ))}
    </Stack>
  </Box>
);

GameSkeleton.propTypes = { title: PropTypes.string };

// 右欄：流程圖的方塊，再往下是那張列表
const FlowSkeleton = () => (
  <Stack spacing={1} sx={{ flex: '1 1 0', minWidth: 240, p: 2 }}>
    <Skeleton variant="text" width="30%" height={16} />
    {/* 縮排模擬流程圖的分支，比一排等寬方塊更像那張圖 */}
    {[0, 3, 6, 3, 0, 3].map((indent, i) => (
      <Box key={i} sx={{ pl: `${indent * 8}px` }}>
        <Skeleton variant="rounded" height={26} width={`${72 - indent * 4}%`} />
      </Box>
    ))}
    <Box sx={{ pt: 2 }}>
      <Skeleton variant="text" width="25%" height={16} />
    </Box>
    {[0, 1, 2, 3].map((i) => (
      <Skeleton key={i} variant="text" height={14} />
    ))}
  </Stack>
);

const LoadingScreen = ({ label = '', fadingOut = false, title = '' }) => {
  const narrow = useMediaQuery(`(max-width:${NARROW - 1}px)`);
  // 會動的東西對某些人是負擔，系統設定說不要動就不要動。
  // MUI 的 Skeleton 用 animation={false} 關掉波浪，剩下靜態的灰塊——
  // 形狀還在，所以「東西要來了、長這樣」這件事沒有跟著消失。
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        bgcolor: 'background.default',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 260ms ease',
        // 淡出中不要擋住底下已經可以用的介面
        pointerEvents: fadingOut ? 'none' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // 動畫統一在這裡關，不必每個 Skeleton 各寫一次。
        // **兩個選擇器都要**：MUI 預設的 pulse 掛在元素本身，
        // wave 才掛在 ::after——只關一個等於沒關。
        ...(reduceMotion
          ? {
              '& .MuiSkeleton-root, & .MuiSkeleton-root::after': {
                animation: 'none',
              },
            }
          : null),
      }}
    >
      <Box
        sx={{
          flex: '1 1 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          minHeight: 0,
        }}
      >
        {/* 窄螢幕上三欄本來就擺不下（CreateApp 預設把兩側收起來），
            骨架跟著只留中間，否則它承諾了一個不會出現的版面。 */}
        {!narrow && <LeftSkeleton />}
        <GameSkeleton title={title} />
        {!narrow && <FlowSkeleton />}
      </Box>

      {/* 骨架對螢幕閱讀器沒有意義，所以「正在讀取」這句話要留著 */}
      <Box sx={{ textAlign: 'center', pb: 3, px: 2 }}>
        <Typography
          variant="caption"
          role="status"
          aria-live="polite"
          sx={{ color: 'text.disabled' }}
        >
          {label ? `正在讀取${label}` : '讀取中'}．表格比較大時要幾秒
        </Typography>
      </Box>
    </Box>
  );
};

LoadingScreen.propTypes = {
  label: PropTypes.string,
  fadingOut: PropTypes.bool,
  title: PropTypes.string,
};

export default LoadingScreen;
