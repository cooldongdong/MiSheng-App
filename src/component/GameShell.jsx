import PropTypes from 'prop-types';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Container } from '@mui/material';
import { GameProvider } from '../store/game-provider';
import FixedBottomNavigation from './BottomNavigation';
import MissionPage from './page/MissionPage';
import PropPage from './page/PropPage';
import HintPage from './page/HintPage';
import StoryPage from './page/StoryPage';
import GameController from '../game/GameController';

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
  dataVersion = 0,
  onPositionLost = null,
  devTools = false,
  leftPanel = null,
  sidePanel = null,
  sideFlex = 1, // 面板收合時傳 '0 0 auto'，讓遊戲吃滿剩下的空間
  resizable = true,
}) => {
  const [value, setValue] = useState(2);
  // 兩條分隔線：左面板寬度、遊戲那欄的寬度
  const [leftW, setLeftW] = useState(268);
  const [paneW, setPaneW] = useState(420);
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
    if (!gameData) return <div>載入中...</div>;

    switch (value) {
      case 0:
        return <MissionPage />;
      case 1:
        return <PropPage />;
      case 2:
        return (
          <GameController
            {...gameData}
            dataVersion={dataVersion}
            devTools={devTools}
          />
        );
      case 3:
        return <HintPage />;
      case 4:
        return <StoryPage />;
      default:
        return <div>未知頁面內容</div>;
    }
  };

  return (
    <GameProvider
      gameFolder={gameFolder}
      previewMode={previewMode}
      imgMap={imgMap}
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

          <Box
            id="TabBar"
            sx={{
              width: '100%',
              position: sidePanel || leftPanel ? 'absolute' : 'fixed',
              bottom: sidePanel || leftPanel ? -56 : 0,
              left: 0,
            }}
          >
            <FixedBottomNavigation
              value={value}
              onChange={(event, newValue) => setValue(newValue)}
            />
          </Box>
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
  dataVersion: PropTypes.number,
  onPositionLost: PropTypes.func,
  devTools: PropTypes.bool,
  leftPanel: PropTypes.node,
  sidePanel: PropTypes.node,
  sideFlex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  resizable: PropTypes.bool,
};

export default GameShell;
