import './App.css';
import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import GameShell from './component/GameShell';
import ColorSchemeToggle from './component/ColorSchemeToggle';
import { getGameFolders, loadGameData } from './game/gameLoader';

function App() {
  const [gameData, setGameData] = useState(null);
  const [gameFolder, setGameFolder] = useState(null);

  useEffect(() => {
    const load = async () => {
      const folders = getGameFolders();
      if (folders.length === 0) return;
      setGameFolder(folders[0]);
      const data = await loadGameData(folders[0]); // 先載入第一個遊戲資料夾
      setGameData(data);
    };

    load();
  }, []);

  return (
    <>
      {/* 外觀開關只加在這裡（/demo），不加進 GameShell——GameShell 也被 /create 用，
          那邊右上角已經有一顆了，放進去會變成同一個畫面上兩顆開關。

          位置避開 ModelTestInfo：那一列的內容框是 76% 置中，所以左右各留 12% 是空的，
          開關就坐在右邊那塊空白裡。底下墊一層半透明，不然疊在遊戲插圖上會看不見。 */}
      <Box
        sx={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 1200,
          borderRadius: 2,
          bgcolor: 'background.overlay',
        }}
      >
        <ColorSchemeToggle />
      </Box>
      <GameShell gameData={gameData} gameFolder={gameFolder} />
    </>
  );
}

export default App;
