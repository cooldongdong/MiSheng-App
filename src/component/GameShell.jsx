import PropTypes from 'prop-types';
import { useState } from 'react';
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
  sidePanel = null,
}) => {
  const [value, setValue] = useState(2);

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
          display: sidePanel ? 'flex' : 'block',
          alignItems: 'stretch',
        }}
      >
        <Container
          maxWidth="sm"
          disableGutters={!!sidePanel}
          sx={{
            height: 'calc(100dvh - 56px)',
            backgroundColor: '#eee',
            width: sidePanel ? 420 : '100%',
            flex: sidePanel ? '0 0 420px' : undefined,
            position: sidePanel ? 'relative' : undefined,
            margin: sidePanel ? 0 : undefined,
          }}
        >
          <Box
            id="main-container"
            sx={{
              position: sidePanel ? 'absolute' : 'fixed',
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
              position: sidePanel ? 'absolute' : 'fixed',
              bottom: sidePanel ? -56 : 0,
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
          <Box sx={{ flex: 1, minWidth: 0, height: '100dvh', overflow: 'hidden' }}>
            {sidePanel}
          </Box>
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
  sidePanel: PropTypes.node,
};

export default GameShell;
