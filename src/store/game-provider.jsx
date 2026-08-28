import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  // 走過的路：每次前進／跳關就把「離開的那一列」推進來，← 後退時沿著它退回去。
  //
  // 為什麼不是「物理上一列」：流程一有分支，rundown 的上一列就跟你剛才在的那一頁
  // 沒有關係了——Quiz 的選項是獨立的 row，nextId 跳轉之後的上一列是另一條支線的
  // 尾巴。真正想要的是「回到剛才那一頁」，那只有走過的路徑記得。
  //
  // 不寫進 localStorage：這是這一次試玩的導覽軌跡，重整就該消失，
  // 跟「玩到哪」（currentId）不是同一種東西。
  const [history, setHistory] = useState([]);

  // 鍵盤的兩種導覽（Dong 2026-08-27）：
  //   false ＝ 流程模式，↑↓ 沿著流程的邊走（誰指向誰）
  //   true  ＝ 地圖模式，↑↓←→ 照流程圖上的位置走，而且**方向鍵的優先權高於一切**
  //            ——Quiz、輸入框都攔不住它。是一個「方向鍵屬於圖」的模式，不是
  //            「有時候這樣有時候那樣」，所以不會有現在到底在哪一種的困惑。
  const [mapMode, setMapMode] = useState(false);

  // (id, 'up'|'down'|'left'|'right') => id｜null。由流程圖那邊塞進來——座標是圖才有的
  // 概念，而且節點集合要跟畫面上看到的一致（摺疊是 FlowMap 的內部狀態）。
  // 沒有圖的時候（/demo）它是 null，地圖模式自然就不存在。
  const [spatialNav, setSpatialNavRaw] = useState(null);
  // useState 存「函式」一定要包一層：直接傳函式會被當成 updater 呼叫掉
  const setSpatialNav = useCallback((fn) => setSpatialNavRaw(() => fn ?? null), []);
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
    // 資料換過了，舊的軌跡指向的那些 id 可能都不存在了，整條丟掉
    setHistory([]);
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

  // 前進／跳關一律走這裡，才記得下走過的路。
  // 直接 setCurrentId 的地方只剩「設起點」——那一列本來就不該進歷史。
  const goToId = useCallback(
    (id) => {
      if (id === null || id === undefined || id === currentId) return;
      if (currentId !== null && currentId !== undefined) {
        setHistory((h) => [...h, currentId]);
      }
      setCurrentId(id);
    },
    [currentId]
  );

  // 回到剛才那一頁。
  //
  // 沿路的狀態（{{變數}}、關卡進度、解鎖的提示）**不會**跟著倒回來——那需要一整套
  // 快照堆疊，成本高一個量級。這裡的定位是給創作者驗流程用的導覽鍵，不是玩家的
  // 「上一頁」，所以與流程圖的「點方塊跳關」接受同一個限制。
  //
  // 退的目標可能在換資料後已經不存在（id 被改掉或刪掉），所以是一路 pop
  // 到找得到的那一列為止，而不是退一格就算數。
  const goBack = useCallback(() => {
    const rows = Array.isArray(rundownData) ? rundownData : [];
    let stack = history;
    while (stack.length > 0) {
      const prev = stack[stack.length - 1];
      stack = stack.slice(0, -1);
      if (rows.some((row) => row?.id === prev)) {
        setHistory(stack);
        setCurrentId(prev);
        return true;
      }
    }
    setHistory([]);
    return false;
  }, [history, rundownData]);

  // 「現在退回去會落在哪一列」——跟 goBack 同一條規則（一路 pop 到還存在的那一列）。
  //
  // 抽出來是為了上下滑的預覽（COO-135）：往下拉時露出的那張卡片必須真的是待會會去的
  // 那一頁。自己在外面重算一次「history 的最後一個」會在資料換過之後說謊——那一列可能
  // 已經不存在了，goBack 會再往前跳，於是預覽的跟實際去的不是同一頁。
  const backId = useMemo(() => {
    const rows = Array.isArray(rundownData) ? rundownData : [];
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (rows.some((row) => row?.id === history[i])) return history[i];
    }
    return null;
  }, [history, rundownData]);

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
        goToId,
        goBack,
        canGoBack: history.length > 0,
        backId,
        mapMode,
        setMapMode,
        spatialNav,
        setSpatialNav,
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
