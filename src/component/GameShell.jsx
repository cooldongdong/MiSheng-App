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
const GameShell = ({
  gameData,
  gameFolder,
  previewMode = false,
  imgMap = null,
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

  // 兩條分隔線長一樣
  const splitterSx = {
    flex: '0 0 8px',
    cursor: 'col-resize',
    bgcolor: '#e2e8f0',
    position: 'relative',
    zIndex: 600,
    '&:hover': { bgcolor: '#cbd5e1' },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '2px',
      height: '28px',
      borderRadius: '1px',
      bgcolor: '#94a3b8',
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
        return <GameController {...gameData} />;
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
    >
      <Box
        sx={{
          height: '100dvh',
          display: sidePanel || leftPanel ? 'flex' : 'block',
          alignItems: 'stretch',
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
            backgroundColor: '#eee',
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
  leftPanel: PropTypes.node,
  sidePanel: PropTypes.node,
  sideFlex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  resizable: PropTypes.bool,
};

export default GameShell;
