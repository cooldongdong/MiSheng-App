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

// ---------------------------------------------------------------------------
// 尺寸全部是 2026-09-03 在 1440×900 的實機量測（用 getBoundingClientRect 讀
// 真正的版面，不是目測）：
//
//   左欄      0–268     按鈕 235×31、檢查報告列滿版 h48
//   中間欄    276–691   （415 寬）TabBar 5 格 × 83、h56；頂端兩顆切換 86×33 置中
//   流程圖    700–1208  （508 寬）節點 130×36、縱向間距 74、選取的那顆 136×42
//                        底部工具列 8 顆 30×30
//   右側列表  1209–1440 （231 寬）搜尋框 169×40、每列 h49
//
// 寫死這些數字是刻意的：骨架是一張示意圖，不是版面。真正的版面在遮罩底下已經
// 照自己的規則長好了，這裡差幾像素沒有人看得出來——但**比例對不對看得出來**，
// 所以比例照抄量到的值。
// ---------------------------------------------------------------------------
const NARROW = 1024; // 低於此寬度 CreateApp 預設收起兩側，骨架跟著只留中間
const WITH_LIST = 1200; // 再窄一點右側列表就擠不下
const LEFT_W = 268;
const GAME_W = 415;
const FLOW_MIN = 320;
const LIST_W = 231;
const NODE_W = 130;
const NODE_H = 36;
const NODE_GAP = 74 - NODE_H; // 量到的是間距 74（含節點本身）

// 左欄：SourcePanel。返回列、兩組資料來源、檢查通過、三顆按鈕、檢查報告
const LeftSkeleton = () => (
  <Box sx={{ width: LEFT_W, flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
    {/* 「← 回到 /create」那一列 */}
    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1 }}>
      <Skeleton variant="rounded" width={28} height={28} />
      <Skeleton variant="text" width={90} height={20} />
    </Stack>

    <Stack spacing={1.75} sx={{ px: 2, pt: 2 }}>
      <Skeleton variant="text" width={56} height={14} />
      {/* 試算表／圖片各是「小圖示 ＋ 一行標題 ＋ 一行操作」 */}
      {[0, 1].map((i) => (
        <Stack key={i} direction="row" spacing={1}>
          <Skeleton variant="rounded" width={16} height={16} sx={{ mt: 0.5 }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={18} />
            <Skeleton variant="text" width="45%" height={16} />
          </Box>
        </Stack>
      ))}

      {/* 「檢查通過」那顆 chip */}
      <Skeleton variant="rounded" width={76} height={24} sx={{ borderRadius: 12, mt: 1 }} />

      <Skeleton variant="rounded" width={235} height={31} sx={{ mt: 1 }} />
      <Skeleton variant="rounded" width={235} height={31} />
      {/* 「收到的人只會看到遊戲…」那段說明，三行 */}
      <Box sx={{ pt: 0.5 }}>
        <Skeleton variant="text" width="100%" height={12} />
        <Skeleton variant="text" width="92%" height={12} />
        <Skeleton variant="text" width="60%" height={12} />
      </Box>
      <Skeleton variant="rounded" width={235} height={31} />
    </Stack>

    {/* 「檢查報告（無問題）」是滿版的一列。它**接在匯出按鈕後面**，
        不是釘在左欄底部（量到 y=448／900，剛好在中間） */}
    <Skeleton variant="rectangular" height={48} sx={{ mt: 2 }} />
  </Box>
);

// 中間欄：頂端的兩顆切換、遊戲卡片、底部五格分頁
const GameSkeleton = ({ title }) => (
  <Box
    sx={{
      width: '100%',
      maxWidth: GAME_W,
      flex: '1 1 auto',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* 「照流程走 ／ 照圖走」＋ 說明圖示 */}
    <Stack direction="row" spacing={0} justifyContent="center" alignItems="center" sx={{ pt: 2, pb: 1.5 }}>
      <Skeleton variant="rounded" width={86} height={33} sx={{ borderRadius: '16px 0 0 16px' }} />
      <Skeleton variant="rounded" width={86} height={33} sx={{ borderRadius: '0 16px 16px 0' }} />
      <Skeleton variant="circular" width={20} height={20} sx={{ ml: 1 }} />
    </Stack>

    {/* 遊戲卡片。真的那張是整頁的圖，所以這裡是一整塊，
        標題與內文疊在它下緣——跟首頁「大圖 ＋ 標題 ＋ 簡介 ＋ 開始遊戲」一致。 */}
    <Box
      sx={{
        flex: '1 1 auto',
        mx: 5,
        mb: 1,
        minHeight: 160,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        position: 'relative',
      }}
    >
      {/* 高寬要寫明。MUI 的 Skeleton 沒給尺寸時 height 是 auto，
          配上 position:absolute 會塌成 0，整塊大圖就不見了。 */}
      <Skeleton
        variant="rectangular"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <Box sx={{ position: 'relative', p: 2 }}>
        {/* 知道遊戲叫什麼就寫出來——骨架配一個真名字，讀起來是
            「你的工作區正在回來」，而不是「有個東西在載」。
            名字來自 recentSheets（上一次成功載入時存的），不用多打一支請求。
            別人分享來的連結查不到，那時就只有骨架，這是對的：
            那份試算表本來就不是他的東西。 */}
        {title ? (
          <Typography variant="h5" noWrap sx={{ fontWeight: 700, opacity: 0.5, mb: 1 }}>
            {title}
          </Typography>
        ) : (
          <Skeleton variant="text" width="65%" height={34} sx={{ mb: 1 }} />
        )}
        <Skeleton variant="text" width="100%" height={12} />
        <Skeleton variant="text" width="96%" height={12} />
        <Skeleton variant="text" width="72%" height={12} />
        {/* 「開始遊戲 →」 */}
        <Skeleton variant="rounded" width={104} height={32} sx={{ mt: 1.5, borderRadius: 16 }} />
      </Box>
    </Box>

    {/* 底部分頁列：五格等寬，每格是圖示 ＋ 一行字 */}
    <Stack direction="row" sx={{ height: 56, alignItems: 'center' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Stack key={i} spacing={0.5} alignItems="center" sx={{ flex: 1 }}>
          <Skeleton variant="rounded" width={22} height={22} />
          <Skeleton variant="text" width={26} height={10} />
        </Stack>
      ))}
    </Stack>
  </Box>
);

GameSkeleton.propTypes = { title: PropTypes.string };

// 右側流程圖：置中的一直排節點、串起它們的縱線、底部工具列
const FlowSkeleton = () => (
  <Box
    sx={{
      flex: `1 1 ${FLOW_MIN}px`,
      minWidth: FLOW_MIN,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {/* 「32 節點／32 列」 */}
    <Skeleton variant="text" width={82} height={16} sx={{ m: 1.5 }} />

    {/* 這一層自己裁切，不要靠外層——節點刻意畫得比一屏多，
        不裁的話最後一顆會壓在底部工具列上面。 */}
    <Box sx={{ flex: '1 1 auto', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
      {/* 串起節點的那條縱線，在節點底下 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: '2px',
          bgcolor: 'action.hover',
        }}
      />
      <Stack spacing={`${NODE_GAP}px`} alignItems="center" sx={{ position: 'relative', pt: 0.5 }}>
        {/* 第三顆畫成「被選取」的樣子（量到的是 136×42，比其他顆大一圈）
            ——真的流程圖一定有一顆是目前所在，骨架少了它會少一層資訊 */}
        {/* 12 顆是「1440×900 底下一屏塞得下的數量」（量到的間距 74）。
            多畫幾顆讓它排滿整欄——真的流程圖是一路往下接到底的，
            排到一半就停會露出一截沒有節點的縱線，反而像壞掉。
            超出的部分由外層的 overflow:hidden 裁掉。 */}
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            width={i === 2 ? 136 : NODE_W}
            height={i === 2 ? 42 : NODE_H}
          />
        ))}
      </Stack>
    </Box>

    {/* 底部那排縮放／版面工具，8 顆 */}
    <Stack direction="row" spacing={1} justifyContent="center" sx={{ py: 1.5 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Skeleton key={i} variant="circular" width={30} height={30} />
      ))}
    </Stack>
  </Box>
);

// 最右側列表：搜尋框、關卡數、每一列是「MissionStart 標籤 ＋ 關卡編號 ＋ 標題」
const ListSkeleton = () => (
  <Stack spacing={1} sx={{ width: LIST_W, flex: '0 0 auto', px: 1.5, pt: 5, pb: 1.5 }}>
    <Skeleton variant="rounded" width={169} height={40} sx={{ alignSelf: 'flex-end', borderRadius: 20 }} />
    <Skeleton variant="text" width={58} height={14} />
    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
      <Box key={i} sx={{ py: 0.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Skeleton variant="rounded" width={64} height={12} />
          <Skeleton variant="text" width={44} height={12} />
        </Stack>
        <Skeleton variant="text" width={i % 3 === 0 ? '78%' : '62%'} height={18} />
      </Box>
    ))}
  </Stack>
);

const LoadingScreen = ({ label = '', fadingOut = false, title = '' }) => {
  const narrow = useMediaQuery(`(max-width:${NARROW - 1}px)`);
  const withList = useMediaQuery(`(min-width:${WITH_LIST}px)`);
  // 會動的東西對某些人是負擔，系統設定說不要動就不要動。
  // 關掉之後剩下靜態的灰塊——形狀還在，所以「東西要來了、長這樣」沒有跟著消失。
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
      <Box sx={{ flex: '1 1 auto', display: 'flex', alignItems: 'stretch', minHeight: 0 }}>
        {/* 窄螢幕上三欄本來就擺不下（CreateApp 預設把兩側收起來），
            骨架跟著只留中間，否則它承諾了一個不會出現的版面。 */}
        {!narrow && <LeftSkeleton />}
        <GameSkeleton title={title} />
        {!narrow && <FlowSkeleton />}
        {!narrow && withList && <ListSkeleton />}
      </Box>

      {/* 骨架對螢幕閱讀器沒有意義，所以「正在讀取」這句話要留著 */}
      <Box sx={{ textAlign: 'center', pb: 1.5, px: 2 }}>
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
