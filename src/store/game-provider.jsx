import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from './game-context';
import { resolveExternalImg } from '../game/imgUrl';


// 在模組頂層把所有 img 檔一次攔進來（打包時會生成真實 URL）
const IMAGE_MAP = import.meta.glob(
  '/src/gameFile/**/img/**/*.{png,jpg,jpeg,webp,svg,gif}',
  { eager: true, as: 'url' }
);

// previewMode：即時轉化（/create）的一次性試玩——不讀也不寫 localStorage，重整即消失
// imgMap：本機圖片資料夾的「檔名 → blob: 網址」對照表（只有 /create 會給）
// onPositionLost：就地換資料後，原本停留的那一列不見了、只好退回開頭時通知外面
export const GameProvider = ({
  children,
  gameFolder,
  previewMode = false,
  imgMap = null,
  onPositionLost = null,
}) => {
  // 只需匯入一次的遊戲資料
  const [characterData, setCharacterData] = useState(null);
  const [hintData, setHintData] = useState(null);
  const [missionData, setMissionData] = useState([]);
  const [propData, setPropData] = useState(null);
  const [rundownData, setRundownData] = useState(null);
  const [storyData, setStoryData] = useState(null);
  const [configData, setConfigData] = useState(null);
  // 已解析進來的是「第幾版」資料。null＝還沒載入。
  // 原本是 isDataLoaded 布林值，只認得「載過沒」，所以 /create 就地重新讀取時
  // 新 CSV 永遠進不來——只能整棵樹卸載重掛（那會順手把玩家的進度也歸零）。
  const [loadedVersion, setLoadedVersion] = useState(null);

  // 玩家資料
  const [gameId, setGameId] = useState(null);

  // 用函式取圖，不再用 `src/...` 這種字串 ===
  const getImg = useCallback(
    (relPath) => {
      if (!relPath) return null;

      // ① 本機圖片資料夾（/create 選了資料夾時）：表格照舊填檔名就好
      if (imgMap) {
        const key = String(relPath).trim().replace(/^\/+/, '');
        const local = imgMap.get(key) ?? imgMap.get(key.split('/').pop());
        if (local) return local;
      }

      // ② 外連網址（Drive 分享連結／GitHub raw…）：直接用，不查 build-time 的 IMAGE_MAP
      const external = resolveExternalImg(relPath);
      if (external) return external;

      // ③ build-time 打包進來的 src/gameFile/{遊戲}/img/
      if (!gameFolder) return null;

      // 支援子資料夾：relPath 可傳 'bg2.png' 或 'character/a.png'
      const keyA = `/src/gameFile/${gameFolder}/img/${relPath}`;
      const keyB = `/src/gameFile/${gameFolder}/img/${relPath.replace(
        /^\/+/,
        ''
      )}`;

      return IMAGE_MAP[keyA] ?? IMAGE_MAP[keyB] ?? null; // 找不到就回 null
    },
    [gameFolder, imgMap]
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
  const [currentId, setCurrentId] = useState(null);
  const [currentMissionId, setCurrentMissionId] = useState('0');
  const [unlockedHints, setUnlockedHints] = useState({});
  const [customPairs, setCustomPairs] = useState({});

  // 當 gameId 設定完成後，從 localStorage 載入數據
  useEffect(() => {
    if (!gameId || previewMode) return;

    setPlayerMissionData(
      JSON.parse(localStorage.getItem(getStorageKey('playerMissionData'))) || []
    );
    setCurrentId(localStorage.getItem(getStorageKey('currentId')) || null);
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

  // 讓 effect 拿得到最新的 callback，又不必把它放進 deps（每次 render 都是新函式，
  // 放進去會讓下面那條 effect 每次都重跑）
  const onPositionLostRef = useRef(onPositionLost);
  onPositionLostRef.current = onPositionLost;

  // 起點＝rundown 的第一列（不再假設第一列的 id 叫 "1"）
  // 資料是非同步載入的，所以等 rundownData 就緒才設。兩種情況都會落到第一列：
  //   ① 還沒有 currentId（新玩／無存檔）
  //   ② 原本停的那一列在新資料裡不見了——/create 就地重新讀取後，如果那一列的 id
  //      被改掉或刪掉，不退回開頭就會停在一個不存在的位置，畫面只剩「Loading...」
  // 「還在不在」必須跟 GameController 找 currentRow 用同一種比對（嚴格相等），
  // 否則會出現「這裡判定還在、那裡卻找不到」的空白畫面
  useEffect(() => {
    if (!Array.isArray(rundownData)) return;
    const firstRow = rundownData.find((row) => row?.id);
    if (!firstRow) return;
    if (currentId && rundownData.some((row) => row?.id === currentId)) return;
    if (currentId) onPositionLostRef.current?.();
    setCurrentId(firstRow.id);
  }, [rundownData, currentId]);

  // 當狀態改變時存入 localStorage（使用 gameId 作為 key）
  useEffect(() => {
    if (!gameId || previewMode) return;
    localStorage.setItem(
      getStorageKey('playerMissionData'),
      JSON.stringify(playerMissionData)
    );
  }, [playerMissionData]);

  useEffect(() => {
    if (!gameId || !currentId || previewMode) return;
    localStorage.setItem(getStorageKey('currentId'), currentId);
  }, [currentId]);

  useEffect(() => {
    if (!gameId || previewMode) return;
    localStorage.setItem(getStorageKey('currentMissionId'), currentMissionId);
  }, [currentMissionId]);

  useEffect(() => {
    if (!gameId || previewMode) return;
    localStorage.setItem(
      getStorageKey('unlockedHints'),
      JSON.stringify(unlockedHints)
    );
  }, [unlockedHints]);

  useEffect(() => {
    if (!gameId || previewMode) return;
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
        loadedVersion,
        setLoadedVersion,
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
  previewMode: PropTypes.bool,
  imgMap: PropTypes.instanceOf(Map),
  onPositionLost: PropTypes.func,
};
