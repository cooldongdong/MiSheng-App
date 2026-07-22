import './App.css';
import { useState, useEffect } from 'react';
import GameShell from './component/GameShell';
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

  return <GameShell gameData={gameData} gameFolder={gameFolder} />;
}

export default App;
