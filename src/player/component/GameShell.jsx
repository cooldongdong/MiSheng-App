import PropTypes from 'prop-types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Container, Stack } from '@mui/material';
import GameMenu from './common/GameMenu';
import OnboardingTour from './common/OnboardingTour';
import { GameProvider } from '../store/game-provider';
import FixedBottomNavigation from './BottomNavigation';
import MissionPage from './page/MissionPage';
import PropPage from './page/PropPage';
import HintPage from './page/HintPage';
import StoryPage from './page/StoryPage';
import GameController from '../game/GameController';
import GameLoading from './common/GameLoading';
import DiagOverlay from './common/DiagOverlay';
import { useTouchClickRecovery } from '../hook/useTouchClickRecovery';
import { TAB, GAME_OVERLAY_ID } from './common/layout';

// 現場量測面板：網址帶 ?diag=1 才出現（見 DiagOverlay）
const wantsDiag = () => {
  try {
    return new URLSearchParams(window.location.search).get('diag') === '1';
  } catch {
    return false;
  }
};
import ChromeFade from './common/ChromeFade';

// 中間那一欄預設就是「一支手機」。
//
// 原本寫死 420。那個值在 900px 高的視窗剛好對（420×900 ＝ 2.14，幾乎就是 iPhone 的
// 19.5:9），但它是常數而高度會跟著視窗走——**視窗愈高，那一欄看起來愈瘦**：
// 16 吋全螢幕（1117）會變成 2.66，外接螢幕（1300）會變成 3.10，那已經不是手機是燈條。
// 2026-08-29 Dong 回報「有點太瘦」就是這個。
//
// 所以寬度改成從高度推回來。900px 高時算出 415，跟原本的 420 差 5px——
// 也就是說常見情況幾乎沒變，只有原本算錯的那一段才會動。
//
// 為什麼用 innerHeight 而不是扣掉 56 的導覽列高度：那條導覽列是**遊戲自己的分頁列**，
// 玩家在手機上看到的就是它，所以它算在「手機」裡面。
const PHONE_RATIO = 19.5 / 9;
const PANE_MIN = 300; // 再窄下去對白就開始折行折得很醜
const PANE_MAX = 600; // 遊戲內容本身就 maxWidth: 600，再寬只是兩側留白
const phonePaneWidth = () => {
  try {
    return Math.round(
      Math.min(PANE_MAX, Math.max(PANE_MIN, window.innerHeight / PHONE_RATIO))
    );
  } catch {
    return 420; // 拿不到視窗高度時退回原本那個值
  }
};

// 遊戲外殼：底部分頁切換 ＋ 版面，資料從哪來由外面決定
//   - App.jsx：build-time 的 src/gameFile/（gameFolder 有值，圖片走 IMAGE_MAP）
//   - CreateApp.jsx：即時轉化（gameFolder 為空，圖片走本機資料夾或外連網址）
//
// sidePanel：給開發用的並排面板（/create 的流程圖）。有值時遊戲縮到左半邊，
// 面板放右邊；面板要跟遊戲共用 GameContext，所以掛在 Provider 裡面。
//
// dataVersion：gameData 換過幾次。/create 就地重新讀取時 +1，讓 GameController
//   知道要重解析——這樣才能不卸載整棵樹（卸載會連玩家停在哪一列都一起歸零）。
// onPositionLost：換完資料後原本停的那一列不見了、只好退回開頭時通知外面。
const GameShell = ({
  gameData,
  gameFolder,
  previewMode = false,
  imgMap = null,
  imgBase = null, // 獨立播放器：圖片的相對根目錄（game/img/）
  imgLookup = null, // build-time 遊戲的圖片查表（只有 /demo 會給）
  dataVersion = 0,
  onPositionLost = null,
  devTools = false,
  headerActions = null,
  brand = null, // 左上角：這是誰做的（右上角是這一頁的控制項）
  leftPanel = null,
  sidePanel = null,
  sideFlex = 1, // 面板收合時傳 '0 0 auto'，讓遊戲吃滿剩下的空間
  resizable = true,
}) => {
  // Chrome 在滑動翻頁後會吞掉下一次觸控的 click（見 hook 檔頭的證據）
  useTouchClickRecovery();

  const [value, setValue] = useState(TAB.PLAY);
  // 「再看一次」：GameMenu 按一下就 +1，導覽看到它變了就重開。
  // 用計數器而不是布林，是因為導覽關掉之後還要能再被叫起來——
  // 布林要先關才能再開，狀態會跟導覽自己的 open 打架。
  const [tourNonce, setTourNonce] = useState(0);
  // 兩條分隔線：左面板寬度、遊戲那欄的寬度
  const [leftW, setLeftW] = useState(268);
  const [paneW, setPaneW] = useState(phonePaneWidth);
  const dragging = useRef(null); // 'left' | 'right' | null
  const gameRef = useRef(null);

  const startDrag = useCallback(
    (which) => (e) => {
      dragging.current = which;
      e.preventDefault();
    },
    []
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;

      // 視窗寬度取不到時（例如分頁在背景）會是 0，夾擠順序要讓「最小值」在最外層，
      // 否則會算出負寬度、整欄塌掉
      const vw = document.documentElement.clientWidth || window.innerWidth || 1280;

      if (dragging.current === 'left') {
        setLeftW(Math.max(200, Math.min(x, vw - 420)));
        return;
      }
      // 遊戲那欄的寬度＝游標位置減掉它的左邊界（有左面板時不能直接用 clientX，
      // 不然分隔線會超前游標一個左面板的寬度，拖起來就跟不上手）
      const left = gameRef.current?.getBoundingClientRect().left ?? 0;
      setPaneW(Math.max(300, Math.min(x - left, vw - left - 280)));
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // 兩條分隔線長一樣。
  //
  // 這條 bar 有 8px 寬（要抓得到），所以它不是一條線、是一塊面——用 divider 的值上色
  // 會變成兩側面板之間插進一塊比誰都亮的板子，深色模式下特別跳。改成跟面板同色，
  // 讓「這裡可以拖」這件事由中間那根握把去講，而不是由整條 bar 去喊。
  const splitterSx = {
    flex: '0 0 8px',
    cursor: 'col-resize',
    bgcolor: 'background.paper',
    position: 'relative',
    zIndex: 600,
    transition: 'background-color 120ms ease',
    '&:hover': { bgcolor: 'action.hover' },
    '&:hover::after': { bgcolor: 'text.secondary' },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '2px',
      height: '28px',
      borderRadius: '1px',
      // 握把才是要被看見的東西，但也只要「看得見」就好——滑過去才提亮
      bgcolor: 'text.disabled',
      transition: 'background-color 120ms ease',
    },
  };

  const renderMainContainer = () => {
    if (!gameData) return <GameLoading />;

    switch (value) {
      case TAB.MISSIONS:
        return <MissionPage />;
      case TAB.PROPS:
        return <PropPage />;
      case TAB.PLAY:
        return (
          <GameController
            {...gameData}
            dataVersion={dataVersion}
            devTools={devTools}
          />
        );
      case TAB.HINTS:
        return <HintPage />;
      case TAB.STORIES:
        return <StoryPage />;
      default:
        return <div>未知頁面內容</div>;
    }
  };

  return (
    <GameProvider
      goToTab={setValue}
      gameFolder={gameFolder}
      previewMode={previewMode}
      imgMap={imgMap}
      imgBase={imgBase}
      imgLookup={imgLookup}
      onPositionLost={onPositionLost}
    >
      <Box
        sx={{
          height: '100dvh',
          display: sidePanel || leftPanel ? 'flex' : 'block',
          alignItems: 'stretch',
          // 遊戲欄兩側的襯底。原本是 App.css 的 #root 在上色，但 #root 是掛載點、
          // 碰不到 theme，深色模式下會留一片亮灰。改由這裡畫，值就跟著 palette 走。
          bgcolor: 'game.frame',
        }}
      >
        {leftPanel && (
          <>
            <Box sx={{ flex: `0 0 ${leftW}px`, minWidth: 0, height: '100dvh' }}>
              {leftPanel}
            </Box>
            <Box onPointerDown={startDrag('left')} sx={splitterSx} />
          </>
        )}
        <Container
          ref={gameRef}
          maxWidth="sm"
          disableGutters={!!sidePanel}
          sx={{
            height: 'calc(100dvh - 56px)',
            backgroundColor: 'game.bg',
            width: sidePanel && resizable ? paneW : '100%',
            flex:
              sidePanel && resizable
                ? `0 0 ${paneW}px`
                : sidePanel || leftPanel
                  ? 1
                  : undefined,
            position: leftPanel || sidePanel ? 'relative' : undefined,
            // 收起流程圖時遊戲要置中，不然會黏在左邊、右側一片空白
            margin: sidePanel && resizable ? 0 : undefined,
          }}
        >
          <Box
            id="main-container"
            sx={{
              position: sidePanel || leftPanel ? 'absolute' : 'fixed',
              width: '100%',
              height: 'calc(100dvh - 56px)',
              zIndex: 550,
              top: 0,
              left: 0,
              // **關掉文字選取。這是「翻頁後第一下按不動」的成因。**
              //
              // 翻頁是在對白文字上拖曳兩百多像素，而 Android Chrome 會把那個
              // 拖曳當成「選字」。選取一旦存在，**下一次點擊就被瀏覽器用來取消
              // 選取，不會產生 click**——所以第一下沒反應、第二下才行。
              //
              // 這一條解釋了五輪量測的每一項：事件都在（down／up 正常）、沒人
              // preventDefault、不在 inert 裡、位移 0px、目標同一顆、主執行緒
              // 也不忙（long 155ms）——因為問題根本不在頁面裡，是瀏覽器層級的
              // 手勢。也解釋了為什麼連量測面板自己的按鈕都中招。
              //
              // 遊戲不是文件，選字在這裡沒有用途；輸入框另外開回來。
              userSelect: 'none',
              WebkitUserSelect: 'none',
              '& input, & textarea': {
                userSelect: 'text',
                WebkitUserSelect: 'text',
              },
              // 全螢幕道具（放大的圖、Wheel、Camera）都是 position: fixed——在 /demo
              // 整個視窗就是遊戲，所以剛好正確；但嵌在 /create 的三欄裡時，fixed 是
              // 相對「視窗」而不是「遊戲那一欄」，它們會蓋掉整個畫面。
              // transform 會讓這個 Box 成為底下所有 fixed 後代的定位基準，一次把
              // 現有與未來的全螢幕道具都關回遊戲欄內，不必每個元件各自去判斷。
              transform: sidePanel || leftPanel ? 'translateZ(0)' : undefined,
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                maxWidth: '600px',
                boxSizing: 'border-box',
                margin: 'auto',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {renderMainContainer()}
            </Box>
          </Box>

          {/* 左上角＝身分與出口，右上角＝這一頁的控制項。
              兩邊都只在 !devTools 時出現：/create 的三欄有自己的導覽列（左欄頂端），
              不需要在遊戲畫面上再疊一顆。 */}
          {wantsDiag() && <DiagOverlay />}

          {!devTools && brand && (
            <ChromeFade sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1200 }}>
              {brand}
            </ChromeFade>
          )}

          {/* 右上角那組控制項。掛在這裡（Provider 內）而不是 App.jsx，是因為重啟鈕
              要拿 gameId 與 clearGameData；順帶讓外觀開關跟它排在一起，不必各自
              算座標。/create 不給——那邊右上角已經有面板按鈕，而且重啟鈕在
              previewMode 下只會把試算表一起丟掉。 */}
          {!devTools && (
            <ChromeFade
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1200,
                borderRadius: 2,
                bgcolor: 'background.overlay',
              }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                {/* headerActions 留著給宿主塞東西（/create 用它放外觀開關）。
                    遊戲畫面自己的那三項已經收進 GameMenu。 */}
                {headerActions}
                <GameMenu onReplayTour={() => setTourNonce((n) => n + 1)} />
              </Stack>
            </ChromeFade>
          )}

          {/* 有東西蓋滿畫面時整條淡掉：一是避免玩家想關圖卻誤按分頁，
              二是放大的圖本來就不該被導覽列壓在上面。**只能用淡掉，不能調
              z-index**——理由見下面那段。 */}
          {/* 兩邊一律收起來（Dong 2026-09-05：/create 的作動要跟手機版一樣）。
              /create 曾經例外過一次，因為那邊的舞台只有預覽欄、導覽列坐在欄位下方
              那 56px，收起來會留下一條空白——但那是**舞台不夠大**，不是不該收。
              舞台現在往下多蓋 NAV_HEIGHT，例外就不需要了。
              instantExit：見 chromeMotionSx——它的消失不該被看見。 */}
          {/* **對話框的舞台。** 它是 #main-container 的**兄弟**，不是子孫——
              理由見 layout.js 的 GAME_OVERLAY_ID：#main-container 的 z-index 550
              自成一個堆疊脈絡，掛進去的東西贏不了導覽列的 700（2026-09-05 放大圖的
              縮小鈕標 1102 照樣被蓋掉，就是這件事）。

              三條規格缺一不可：
                · z-index 800  贏過導覽列（700）與分隔線（600）
                · transform    讓 portal 進來的 `position: fixed` 以這裡為定位基準
                               ——那正是「/create 三欄下對話框蓋掉整個視窗」的解法
                · pointerEvents: none  空的時候不能擋住底下的點擊；真的開了對話框時，
                               它自己的根元素會把 pointer-events 要回去

              幾何跟著 #main-container 走：嵌在 /create 裡貼齊遊戲那一欄；
              /demo 則是整個視窗，**而且要含導覽列那 56px**——現況的遮罩是蓋住它的，
              不能退步成「底下那條亮在遮罩外面」。 */}
          <Box
            id={GAME_OVERLAY_ID}
            sx={{
              position: sidePanel || leftPanel ? 'absolute' : 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: sidePanel || leftPanel ? '100%' : '100dvh',
              zIndex: 800,
              transform: 'translateZ(0)',
              pointerEvents: 'none',
              '& > *': { pointerEvents: 'auto' },
            }}
          />

          <ChromeFade
            id="TabBar"
            hideWithOverlay
            instantExit
            from="bottom"
            sx={{
              width: '100%',
              position: sidePanel || leftPanel ? 'absolute' : 'fixed',
              bottom: sidePanel || leftPanel ? -56 : 0,
              left: 0,
              // 要壓過 #main-container 的 550。
              //
              // 導覽列本體不會被蓋到（它在遊戲區下方那 56px 裡），但**提示的小紅點是
              // 往上凸出去的**（MUI Badge 用 translate(50%, -50%) 掛在圖示右上角），
              // 凸進遊戲區的範圍就會被對白框那些東西蓋住（Dong 2026-09-02 回報）。
              // 兩個都是定位元素，有明確 z-index 的那個贏，而這裡原本沒設。
              //
              // 停在 700：要蓋過遊戲內容（550）與分隔線（600）。
              //
              // ⚠️ **原本這裡寫「必須低於全螢幕道具（放大的圖 1000–1102、Camera 1200），
              // 那些東西蓋住導覽列是對的」——那句話是錯的。** 那些元素活在
              // #main-container（550＋transform）建立的堆疊脈絡**裡面**，對外只值 550，
              // 不管自己標多少都贏不了這裡的 700。實測：放大圖片的縮小鈕標 1102，
              // 照樣被「解謎」的圖示蓋掉（Dong 2026-09-05 回報）。
              // ⇒ 要蓋過導覽列的東西不能靠調 z-index。現在的作法是**全螢幕時整條
              //   淡掉**（hideWithOverlay），所以縮小鈕不必再閃避它的位置。
              zIndex: 700,
            }}
          >
            <FixedBottomNavigation
              value={value}
              onChange={(event, newValue) => setValue(newValue)}
            />
          </ChromeFade>

          {/* 新手導覽。掛在這裡而不是 #main-container 裡面，是因為它要照亮的正是
              導覽列——而 #main-container（z-index 550 ＋ transform）是一個堆疊
              脈絡，裡面的東西不管標多少都贏不了外面的 700（見上面那段 ⚠️）。
              !devTools：/create 的三欄是工具，不是給玩家的畫面。 */}
          {!devTools && <OnboardingTour activeTab={value} replayNonce={tourNonce} />}
        </Container>

        {sidePanel && (
          <>
            {/* 拖這條可以調整兩邊的比例 */}
            {resizable && (
              <Box onPointerDown={startDrag('right')} sx={splitterSx} />
            )}
            <Box sx={{ flex: sideFlex, minWidth: 0, height: '100dvh', overflow: 'hidden' }}>
              {sidePanel}
            </Box>
          </>
        )}
      </Box>
    </GameProvider>
  );
};

GameShell.propTypes = {
  gameData: PropTypes.object,
  gameFolder: PropTypes.string,
  previewMode: PropTypes.bool,
  imgMap: PropTypes.instanceOf(Map),
  imgBase: PropTypes.string,
  imgLookup: PropTypes.func,
  dataVersion: PropTypes.number,
  onPositionLost: PropTypes.func,
  devTools: PropTypes.bool,
  headerActions: PropTypes.node,
  brand: PropTypes.node,
  leftPanel: PropTypes.node,
  sidePanel: PropTypes.node,
  sideFlex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  resizable: PropTypes.bool,
};

export default GameShell;
