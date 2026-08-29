import './App.css';
import { useState, useEffect } from 'react';
import GameShell from './component/GameShell';
import ColorSchemeToggle from '../shared/ColorSchemeToggle';
import { getGameFolders, loadGameData, buildTimeImg } from './game/buildTimeGame';

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
      {/* 外觀開關與重啟鈕排在一起，由 GameShell 統一放右上角——重啟鈕需要
          GameContext（gameId / clearGameData），那個 Provider 在 GameShell 裡面，
          所以位置也一併交給它管，兩顆才不會各自算座標然後疊在一起。
          GameShell 只在非 devTools 時渲染這一組，/create 不會多長出一顆開關。 */}
      <GameShell
        gameData={gameData}
        gameFolder={gameFolder}
        imgLookup={buildTimeImg}
        headerActions={<ColorSchemeToggle />}
      />
    </>
  );
}

export default App;
