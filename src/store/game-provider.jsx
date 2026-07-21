import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from './game-context';


// 在模組頂層把所有 img 檔一次攔進來（打包時會生成真實 URL）
const IMAGE_MAP = import.meta.glob(
  '/src/gameFile/**/img/**/*.{png,jpg,jpeg,webp,svg,gif}',
  { eager: true, as: 'url' }
);

export const GameProvider = ({ children, gameFolder }) => {
  // 只需匯入一次的遊戲資料
  const [characterData, setCharacterData] = useState(null);
  const [hintData, setHintData] = useState(null);
  const [missionData, setMissionData] = useState([]);
  const [propData, setPropData] = useState(null);
  const [rundownData, setRundownData] = useState(null);
  const [storyData, setStoryData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 玩家資料
  const [gameId, setGameId] = useState(null);

  // 用函式取圖，不再用 `src/...` 這種字串 ===
  const getImg = useCallback(
    (relPath) => {
      if (!gameFolder || !relPath) return null;

      // 支援子資料夾：relPath 可傳 'bg2.png' 或 'character/a.png'
      const keyA = `/src/gameFile/${gameFolder}/img/${relPath}`;
      const keyB = `/src/gameFile/${gameFolder}/img/${relPath.replace(
        /^\/+/,
        ''
      )}`;

      return IMAGE_MAP[keyA] ?? IMAGE_MAP[keyB] ?? null; // 找不到就回 null
    },
    [gameFolder]
  );

  // 用 id 查 mission（靠 id 不靠陣列位置，mission 的 row 順序／是否連號都無所謂）
  const getMissionById = useCallback(
    (id) => missionData.find((m) => String(m.id) === String(id)) ?? null,
    [missionData]
  );

  useEffect(() => {
    if (!configData) {
      return;
    }
    setGameId(configData[0].id);
  }, [configData, gameId]);

  const getStorageKey = (key) => (gameId ? `${gameId}_${key}` : null);

  const [playerMissionData, setPlayerMissionData] = useState([]);
  const [currentId, setCurrentId] = useState('1');
  const [currentMissionId, setCurrentMissionId] = useState('0');
  const [unlockedHints, setUnlockedHints] = useState({});
  const [customPairs, setCustomPairs] = useState({});

  // 當 gameId 設定完成後，從 localStorage 載入數據
  useEffect(() => {
    if (!gameId) return;

    setPlayerMissionData(
      JSON.parse(localStorage.getItem(getStorageKey('playerMissionData'))) || []
    );
    setCurrentId(localStorage.getItem(getStorageKey('currentId')) || '1');
    setCurrentMissionId(
      localStorage.getItem(getStorageKey('currentMissionId')) || '0'
    );
    setUnlockedHints(
      JSON.parse(localStorage.getItem(getStorageKey('unlockedHints'))) || {}
    );
    setCustomPairs(
      JSON.parse(localStorage.getItem(getStorageKey('customPairs'))) || {}
    );
  }, [gameId]);

  // 當狀態改變時存入 localStorage（使用 gameId 作為 key）
  useEffect(() => {
    if (!gameId) return;
    localStorage.setItem(
      getStorageKey('playerMissionData'),
      JSON.stringify(playerMissionData)
    );
  }, [playerMissionData]);

  useEffect(() => {
    if (!gameId) return;
    localStorage.setItem(getStorageKey('currentId'), currentId);
  }, [currentId]);

  useEffect(() => {
    if (!gameId) return;
    localStorage.setItem(getStorageKey('currentMissionId'), currentMissionId);
  }, [currentMissionId]);

  useEffect(() => {
    if (!gameId) return;
    localStorage.setItem(
      getStorageKey('unlockedHints'),
      JSON.stringify(unlockedHints)
    );
  }, [unlockedHints]);

  useEffect(() => {
    if (!gameId) return;
    localStorage.setItem(
      getStorageKey('customPairs'),
      JSON.stringify(customPairs)
    );
  }, [customPairs]);

  const clearGameData = (gameId) => {
    if (!gameId) {
      return;
    }
    localStorage.removeItem(`${gameId}_playerMissionData`);
    localStorage.removeItem(`${gameId}_currentId`);
    localStorage.removeItem(`${gameId}_currentMissionId`);
    localStorage.removeItem(`${gameId}_unlockedHints`);
    localStorage.removeItem(`${gameId}_customPairs`);

    // 重新整理瀏覽器
    window.location.reload();
  };

  // 更新提示的開啟狀態
  const unlockHint = (missionId, hintIndex) => {
    setUnlockedHints((prev) => ({
      ...prev,
      [missionId]: {
        ...prev[missionId],
        [hintIndex]: true,
      },
    }));
  };

  // 更新任務的完成狀態
  const updateMissionStatus = (missionId, status = 'incomplete') => {
    setPlayerMissionData((prevMissions) => {
      let missionExists = false; // 記錄是否 mission 存在

      const updatedMissions = prevMissions.map((mission) => {
        if (mission.id === missionId) {
          missionExists = true; // 找到目標 mission

          // 如果已經是 complete，不做更動
          if (mission.status === 'complete') {
            return mission;
          }

          // 否則，更新 status
          return { ...mission, status };
        }
        return mission;
      });

      // 如果 mission 存在，回傳更新後的陣列
      if (missionExists) return updatedMissions;

      // 否則，新增新 mission
      return [...prevMissions, { id: missionId, status }];
    });
  };

  // 更新自定義鍵值對
  const updateCustomPairs = (customKey, customValue) => {
    setCustomPairs((prevPairs) => ({
      ...prevPairs,
      [customKey]: customValue,
    }));
  };

  return (
    <GameContext.Provider
      value={{
        //只需匯入一次的資料
        characterData,
        setCharacterData,
        hintData,
        setHintData,
        missionData,
        setMissionData,
        getMissionById,
        propData,
        setPropData,
        rundownData,
        setRundownData,
        storyData,
        setStoryData,
        configData,
        setConfigData,

        playerMissionData,
        setPlayerMissionData,
        isDataLoaded,
        setIsDataLoaded,
        currentId,
        setCurrentId,
        currentMissionId,
        setCurrentMissionId,
        unlockedHints,
        setUnlockedHints,
        unlockHint,
        updateMissionStatus,
        customPairs,
        updateCustomPairs,

        gameId,
        getImg,
        clearGameData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

GameProvider.propTypes = {
  children: PropTypes.node.isRequired,
  gameFolder: PropTypes.string,
};
