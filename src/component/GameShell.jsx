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
//   - CreateApp.jsx：即時轉化的 Google 試算表（gameFolder 為空，圖片走外連網址）
const GameShell = ({ gameData, gameFolder, previewMode = false }) => {
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
    <GameProvider gameFolder={gameFolder} previewMode={previewMode}>
      <Box sx={{ height: '100dvh' }}>
        <Container
          maxWidth="sm"
          sx={{
            height: 'calc(100dvh - 56px)',
            backgroundColor: '#eee',
            width: '100%',
          }}
        >
          <Box
            id="main-container"
            sx={{
              position: 'fixed',
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
              position: 'fixed',
              bottom: 0,
              left: 0,
            }}
          >
            <FixedBottomNavigation
              value={value}
              onChange={(event, newValue) => setValue(newValue)}
            />
          </Box>
        </Container>
      </Box>
    </GameProvider>
  );
};

GameShell.propTypes = {
  gameData: PropTypes.object,
  gameFolder: PropTypes.string,
  previewMode: PropTypes.bool,
};

export default GameShell;
