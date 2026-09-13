import PropTypes from 'prop-types';
import { Box, Skeleton, Typography, useMediaQuery, useTheme } from '@mui/material';

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
//
// ---------------------------------------------------------------------------
// 尺寸與顏色全部是 2026-09-03 在 1900×1110 的實機量測（getBoundingClientRect
// ＋ getComputedStyle 讀真正的版面，不是目測）。第一版是憑印象畫的，比例和配色
// 都對不上——**四欄一律同一個底色**是最明顯的破綻，真實版面每一欄的底色都不同：
//
//   左欄      0–268      background.paper
//   中間欄    276–788    game.bg（#eee，比左右都深／淺一階，這是它最強的辨識特徵）
//     └ 卡片  337–726    background.default（#fafafa），y=144 h=766
//                        —— **在整欄裡置中**（上下各 144）
//   （game.frame 是整個 shell 的襯底，不是這一欄；兩個弄反的話淺色下卡片
//     會跟欄底同色，中間就變成一整片灰）
//     └ 分頁列 y=1054    game.nav，h=56，5 格等寬
//   流程圖    796–1668   canvas.bg ＋ 24px 的點陣（canvas.dot）
//     └ 節點  130×36，縱向間距 75，置中；**第一顆是選取狀態 136×42**
//     └ 工具列 8 顆 30×30，**靠左**（x=814，離欄左緣 18），貼底
//   右列表    1668–1900  background.paper，搜尋框 y=54、每列 h49
//
// 中間欄的寬度不是固定值：GameShell 從視窗高度推回來（900→415、1110→512，
// 兩次都是 46.1%），所以這裡用 46.1vh，才會跟著一起長。
// ---------------------------------------------------------------------------
const NARROW = 1024; // 低於此寬度 CreateApp 預設收起兩側，骨架跟著只留中間
const WITH_LIST = 1200; // 再窄一點右側列表就擠不下
const LEFT_W = 268;
const LIST_W = 232;
const FLOW_MIN = 320;
const MID_W = 'clamp(320px, 46.1vh, 600px)';
const NAV_H = 56;
const NODE_W = 130;
const NODE_H = 36;
const NODE_PITCH = 75;

// 左欄與右列表的每一項都在固定像素位置（欄寬是固定的，不隨視窗變），
// 所以直接用實測座標絕對定位——比疊一堆 spacing 猜出來的準。
const at = (x, y, w, h) => ({ position: 'absolute', left: x, top: y, width: w, height: h });

const LEFT_ITEMS = [
  ['rounded', 8, 9, 28, 28], // 返回鍵
  ['text', 40, 12, 111, 20], // 回到 /create
  ['text', 16, 64, 52, 14], // 「遊戲資料」
  ['rounded', 16, 92, 18, 18], // 資料夾圖示
  ['text', 44, 92, 91, 20], // Google 試算表
  ['text', 44, 115, 54, 20], // 重新讀取
  ['text', 16, 152, 32, 14], // 「圖片」
  ['rounded', 16, 183, 18, 18], // 圖片圖示
  ['text', 44, 183, 113, 20], // 用表格裡填的網址
  ['text', 44, 206, 96, 20], // 改用本機資料夾
  ['chip', 16, 243, 69, 24], // 「檢查通過」
  ['rounded', 16, 279, 235, 31], // 複製試玩連結
  ['rounded', 16, 318, 235, 31], // 顯示 QR
  ['text', 16, 357, 235, 13], // 說明，第一行
  ['text', 16, 375, 196, 13], // 說明，第二行
  ['rounded', 16, 404, 235, 31], // 匯出可上架的遊戲
  ['bar', 0, 448, LEFT_W, 48], // 檢查報告（無問題）——滿版一列
];

const LeftSkeleton = () => (
  <Box
    sx={{
      width: LEFT_W,
      flex: '0 0 auto',
      position: 'relative',
      bgcolor: 'background.paper',
      overflow: 'hidden',
    }}
  >
    {LEFT_ITEMS.map(([kind, x, y, w, h], i) => (
      <Skeleton
        key={i}
        variant={kind === 'text' ? 'text' : kind === 'bar' ? 'rectangular' : 'rounded'}
        sx={{
          ...at(x, y, w, h),
          ...(kind === 'chip' ? { borderRadius: 12 } : null),
        }}
      />
    ))}
  </Box>
);

// 中間欄：頂端的切換、置中的遊戲卡片、底部五格分頁。
// 三塊各自的底色是這一欄最好認的特徵，不能省。
// full＝窄螢幕，這一欄就是整個畫面。
//
// **為什麼用 prop 而不是讓父層用 CSS 蓋。** 原本父層寫 `'& > *': { width: '100%' }`
// 想把它撐滿，但那一行**從來沒有生效過**：`.父層 > *` 與這裡 sx 產生的 `.子層`
// specificity 完全相同（各一個 class），同分時由插入順序決定，而子元件的 emotion
// class 是後插入的——於是 `width: MID_W` 一直贏。
//
// 後果是 Dong 2026-09-13 在 Android 上看到的：骨架只佔畫面約 86%，右側留下一條
// 黑帶，而「正在讀取…」那行字（`right: 16`，貼的是**視窗**右緣）就落在黑帶上，
// 看起來像它把版面撐寬了。**其實沒有任何東西溢出**——量測工具顯示溢出 0px，
// 正是這個假設被推翻的地方：不是有東西太寬，是骨架太窄。
const GameSkeleton = ({ title, full = false }) => (
  <Box
    sx={{
      // clamp 的下限 320px 在窄螢幕上幾乎必定小於視窗寬，所以這裡不能只放寬上限
      width: full ? '100%' : MID_W,
      flex: full ? '1 1 auto' : '0 0 auto',
      minWidth: 0,
      bgcolor: 'game.bg',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Box sx={{ flex: '1 1 auto', position: 'relative', minHeight: 0 }}>
      {/* 「走流程／回剛才那頁」那顆膠囊，置中；說明圖示貼在它右邊。
          它是浮在卡片上方的，所以用絕對定位，不參與卡片的置中計算。 */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Skeleton variant="rounded" width={171} height={33} sx={{ borderRadius: 17 }} />
        <Skeleton variant="circular" width={25} height={25} />
      </Box>

      {/* 卡片在**整欄**裡置中（實測上下各 144／1054），不是接在膠囊底下。
          比例：寬 389／512 ＝ 76%，高 766／1054 ＝ 72.7%。 */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            width: '76%',
            height: '72.7%',
            bgcolor: 'background.default',
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
          <Box sx={{ position: 'relative', p: 2.5 }}>
            {/* 知道遊戲叫什麼就寫出來——骨架配一個真名字，讀起來是
                「你的工作區正在回來」，而不是「有個東西在載」。
                名字來自 recentSheets（上一次成功載入時存的），不用多打一支請求。
                別人分享來的連結查不到，那時就只有骨架，這是對的：
                那份試算表本來就不是他的東西。 */}
            {title ? (
              <Typography variant="h5" noWrap sx={{ fontWeight: 700, opacity: 0.45, mb: 1.5 }}>
                {title}
              </Typography>
            ) : (
              <Skeleton variant="text" width="65%" height={36} sx={{ mb: 1.5 }} />
            )}
            <Skeleton variant="text" width="100%" height={13} />
            <Skeleton variant="text" width="96%" height={13} />
            <Skeleton variant="text" width="70%" height={13} />
            {/* 「開始遊戲 →」 */}
            <Skeleton variant="rounded" width={116} height={36} sx={{ mt: 2, borderRadius: 18 }} />
          </Box>
        </Box>
      </Box>
    </Box>

    {/* 底部分頁列：自己的底色、五格等寬、每格是圖示 ＋ 一行字 */}
    <Box
      sx={{
        height: NAV_H,
        flex: '0 0 auto',
        bgcolor: 'game.nav',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Skeleton variant="rounded" width={22} height={22} />
          <Skeleton variant="text" width={26} height={10} />
        </Box>
      ))}
    </Box>
  </Box>
);

GameSkeleton.propTypes = { title: PropTypes.string, full: PropTypes.bool };

// 右側流程圖：點陣底、置中的一直排節點、靠左貼底的工具列
const FlowSkeleton = () => {
  const theme = useTheme();
  const dot = theme.palette.canvas?.dot || theme.palette.divider;
  return (
    <Box
      sx={{
        flex: `1 1 ${FLOW_MIN}px`,
        minWidth: FLOW_MIN,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'canvas.bg',
        // 真的流程圖底下有一層 24px 的點陣（SVG pattern，circle r=1）。
        // 這裡用 radial-gradient 仿一份——少了它，這一欄看起來就只是塊空白。
        backgroundImage: `radial-gradient(${dot} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {/* 「32 節點／32 列」貼左上 */}
      <Skeleton variant="text" sx={{ ...at(18, 12, 82, 16) }} />

      {/* 節點：置中、間距 75，畫得比一屏多，超出的由外層裁掉。
          **第一顆是選取狀態**（136×42，比其他顆大一圈）——真的流程圖一定有
          一顆是目前所在，少了它會少一層資訊。 */}
      {Array.from({ length: 16 }, (_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          sx={{
            position: 'absolute',
            top: 32 + i * NODE_PITCH,
            left: '50%',
            transform: 'translateX(-50%)',
            width: i === 0 ? 136 : NODE_W,
            height: i === 0 ? 42 : NODE_H,
          }}
        />
      ))}

      {/* 底部工具列：8 顆，**靠左**（實測 x=814，離欄左緣 18） */}
      <Box
        sx={{
          position: 'absolute',
          left: 18,
          bottom: 26,
          display: 'flex',
          gap: 1,
        }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} variant="circular" width={30} height={30} />
        ))}
      </Box>
    </Box>
  );
};

// 最右側列表：搜尋框、關卡數、每一列是「MissionStart 標籤 ＋ 關卡編號 ＋ 標題」
const ListSkeleton = () => (
  <Box
    sx={{
      width: LIST_W,
      flex: '0 0 auto',
      position: 'relative',
      overflow: 'hidden',
      bgcolor: 'background.paper',
    }}
  >
    <Skeleton variant="rounded" sx={{ ...at(16, 54, 200, 40), borderRadius: 20 }} />
    <Skeleton variant="text" sx={{ ...at(16, 106, 58, 14) }} />
    {Array.from({ length: 8 }, (_, i) => {
      const top = 137 + i * 49;
      return (
        <Box key={i}>
          <Skeleton variant="rounded" sx={{ ...at(16, top + 4, 64, 12) }} />
          <Skeleton variant="text" sx={{ ...at(88, top + 4, 44, 12) }} />
          <Skeleton variant="text" sx={{ ...at(16, top + 22, i % 3 === 0 ? 150 : 116, 18) }} />
        </Box>
      );
    })}
  </Box>
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
        bgcolor: 'game.frame',
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 260ms ease',
        // 淡出中不要擋住底下已經可以用的介面
        pointerEvents: fadingOut ? 'none' : 'auto',
        display: 'flex',
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
      {/* 窄螢幕上三欄本來就擺不下（CreateApp 預設把兩側收起來），
          骨架跟著只留中間，否則它承諾了一個不會出現的版面。
          窄螢幕時中間欄要吃滿，所以 flexGrow 開起來。 */}
      {!narrow && <LeftSkeleton />}
      <Box
        sx={{
          flex: narrow ? '1 1 auto' : '0 0 auto',
          display: 'flex',
          minWidth: 0,
          // 這裡原本有一行 `'& > *': { width: '100%' }` 想把中間欄撐滿，
          // 但它跟子元件自己的 sx specificity 同分、而且插入得比較早，所以一直輸。
          // 現在改用 prop 讓 GameSkeleton 自己決定（見它的檔頭註解），這一行拿掉。
        }}
      >
        <GameSkeleton title={title} full={narrow} />
      </Box>
      {!narrow && <FlowSkeleton />}
      {!narrow && withList && <ListSkeleton />}

      {/* 骨架對螢幕閱讀器沒有意義，所以「正在讀取」這句話要留著。
          視覺上壓到最低——真正在說話的是版面。
          **靠右下而不是置中**：正中央的下緣是流程圖工具列的位置（實測 x=814–1082、
          貼底），擺在那裡會疊在骨架上面。
          窄螢幕時整個畫面只剩中間欄，右下角就是分頁列，所以要再往上讓開一格。 */}
      <Typography
        variant="caption"
        role="status"
        aria-live="polite"
        sx={{
          position: 'fixed',
          // **兩邊都要釘。** 只給 right 的話寬度由內容決定、沒有上限，這一行
          // （「正在讀取 Google 試算表．表格比較大時要幾秒」，約 22 個字）在手機
          // 寬度下就是畫面上最寬的東西——Dong 2026-09-13 的 Android 截圖裡，
          // 它延伸到超出骨架右緣，右側多出一條沒有內容的黑帶。
          // 補上 left 之後寬度被鎖在視窗內，放不下就換行，不會再把畫面撐寬。
          left: 16,
          right: 16,
          bottom: narrow ? NAV_H + 10 : 10,
          textAlign: 'right',
          color: 'text.disabled',
          pointerEvents: 'none',
        }}
      >
        {label ? `正在讀取${label}` : '讀取中'}．表格比較大時要幾秒
      </Typography>
    </Box>
  );
};

LoadingScreen.propTypes = {
  label: PropTypes.string,
  fadingOut: PropTypes.bool,
  title: PropTypes.string,
};

export default LoadingScreen;
