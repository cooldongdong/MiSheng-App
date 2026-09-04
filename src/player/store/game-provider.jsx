import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  keyOf,
  normId,
  parseSavedPosition,
  positionToSave,
  resolvePosition,
} from '../../shared/rowKey';
import PropTypes from 'prop-types';
import { GameContext } from './game-context';
import { resolveExternalImg } from '../game/imgUrl';


// previewMode：即時轉化（/create）的一次性試玩——不讀也不寫 localStorage，重整即消失
// imgMap：本機圖片資料夾的「檔名 → blob: 網址」對照表（只有 /create 會給）
// onPositionLost：就地換資料後，原本停留的那一列不見了、只好退回開頭時通知外面
export const GameProvider = ({
  children,
  gameFolder,
  previewMode = false,
  imgMap = null,
  imgBase = null,
  // build-time 遊戲的圖片查表。由 /demo 的入口從 buildTimeGame.js 拿來傳進來——
  // provider 自己不 import 那個檔，否則每一條路（含獨立播放器）都會被迫
  // 把 src/gameFile/ 的圖整包打進 bundle。
  imgLookup = null,
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

      // ④ 獨立播放器：圖片就在同目錄的 game/img/ 底下。
      // 排在 build-time 之前，因為這條路根本沒有 gameFolder——那一層會直接回 null。
      if (imgBase) {
        return new URL(String(relPath).trim().replace(/^\/+/, ''), imgBase).href;
      }

      // ③ build-time 打包進來的 src/gameFile/{遊戲}/img/
      return imgLookup ? imgLookup(gameFolder, relPath) : null; // 找不到就回 null
    },
    [gameFolder, imgMap, imgBase, imgLookup]
  );

  // 用 id 查 mission（靠 id 不靠陣列位置，mission 的 row 順序／是否連號都無所謂）
  const getMissionById = useCallback(
    (id) => missionData.find((m) => String(m.id) === String(id)) ?? null,
    [missionData]
  );

  // gameId ＝ config.id，同時是 localStorage 的命名空間（見 getStorageKey）。
  //
  // **空的話所有存檔會靜默不寫**，而畫面上完全看不出來——玩家一路玩得下去，
  // 重整才發現什麼都沒記住。validator 會擋（config.id 不可空白），
  // 但**播放器拿到的資料不一定經過 validator**（獨立播放器讀的是資料夾），
  // 所以這裡自己出一次聲：能丟，但不可以無聲地丟。
  useEffect(() => {
    if (!configData) {
      return;
    }
    const id = configData[0]?.id;
    if (!id) {
      console.warn(
        '[misheng] config.id 是空的，這一局的進度不會被記住（存檔用它當名字）。' +
          '請在 config 表的 id 欄填一個固定的值。'
      );
    }
    setGameId(id);
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
  // 玩家按下每一關 MissionStart 的「開始遊戲」的時刻（epoch ms），用來算 hint.timer。
  //
  // 存**絕對時間**而不是累計秒數：這是戶外實境遊戲，玩家會鎖螢幕、走路、接電話，
  // 而「卡了三分鐘就該給提示」講的是牆上時鐘，不是螢幕亮著的時間。
  const [missionStartedAt, setMissionStartedAt] = useState({});
  const [customPairs, setCustomPairs] = useState({});

  // 存檔裡那一筆位置（{ key, fp }）。還原只用它一次，用完就清掉——
  // 之後資料再變（/create 就地重讀）走的是「現在停在哪還在不在」那條路，
  // 不該再拿一筆很舊的指紋回來翻案。
  const savedPosRef = useRef(null);

  // 當 gameId 設定完成後，從 localStorage 載入數據
  useEffect(() => {
    if (!gameId || previewMode) return;

    setPlayerMissionData(
      JSON.parse(localStorage.getItem(getStorageKey('playerMissionData'))) || []
    );
    // 存的是 { key, fp }（舊存檔是裸字串，parseSavedPosition 會相容）。
    // 這裡只先把它記下來——**還原要等 rundownData 到齊才做得了**，
    // 因為三層退讓要拿指紋去比對真正的資料（見下面那條 effect）。
    savedPosRef.current = parseSavedPosition(
      localStorage.getItem(getStorageKey('currentId'))
    );
    setCurrentId(savedPosRef.current?.key || null);
    setCurrentMissionId(
      localStorage.getItem(getStorageKey('currentMissionId')) || '0'
    );
    setUnlockedHints(
      JSON.parse(localStorage.getItem(getStorageKey('unlockedHints'))) || {}
    );
    setMissionStartedAt(
      JSON.parse(localStorage.getItem(getStorageKey('missionStartedAt'))) || {}
    );
    setCustomPairs(
      JSON.parse(localStorage.getItem(getStorageKey('customPairs'))) || {}
    );
  }, [gameId]);

  // 讓 effect 拿得到最新的 callback，又不必把它放進 deps（每次 render 都是新函式，
  // 放進去會讓下面那條 effect 每次都重跑）
  const onPositionLostRef = useRef(onPositionLost);
  onPositionLostRef.current = onPositionLost;


  // 玩家停在哪一列。資料是非同步載入的，所以等 rundownData 就緒才決定。
  //
  // **起點＝rundown 的第一列**（不再假設第一列的 id 叫 "1"，也不再跳過沒有 id 的列
  // ——id 可以留空之後，第一列很可能就沒有名字）。
  //
  // 「還在不在」必須跟 GameController 找 currentRow 用同一種比對（keyOf），
  // 否則會出現「這裡判定還在、那裡卻找不到」的空白畫面。
  //
  // **存檔的還原走三層退讓**（COO-137）。只用內部 key 的話，創作者往中間插一列，
  // 沒有名字的列 key 就是位置，玩家的存檔會整個位移一列。所以存檔同時記了內容指紋：
  //
  //   1. key 還在、指紋也對得上 → 直接用
  //   2. 指紋出現在別的地方、而且剛好一筆 → 用它（插／刪列）
  //   3. 都不行 → 退回**這一關的開頭**
  //
  // 第 3 層之所以退得回去，是因為 mission.id 不放寬（COO-136），
  // currentMissionId 一定指得到一個真的關卡。最壞情況是「回到你正在玩的那一關開頭」，
  // 不是掉到別人的關卡、也不是整場重來。
  //
  // 已知極限：**改掉玩家正踩著那一列的文字，指紋就對不上了**——而修錯字正是創作者
  // 最常做的修改。那一種就是靠第 3 層兜住的。
  useEffect(() => {
    if (!Array.isArray(rundownData) || rundownData.length === 0) return;
    const firstKey = keyOf(rundownData[0]);
    if (!firstKey) return;

    // **存檔的第一次還原一定要走三層退讓，不能因為 key 剛好還在就跳過。**
    //
    // 沒有名字的列，key 就是它的位置（`#3`）。創作者往前面插一列之後，那個位置
    // 「還存在」——但指到的是別人。所以「還在不在」對無名列來說不是「還是不是同一列」，
    // 必須拿指紋確認過才算數。
    //
    // （這個順序寫反過的：先擋「還存在」再比指紋，結果是插一列之後玩家安靜地
    // 往前位移一句，而整個功能就是為了解決這件事。）
    const saved = savedPosRef.current;
    if (saved) {
      savedPosRef.current = null;
      const { key } = resolvePosition(rundownData, saved);
      if (key) {
        setCurrentId(key);
        return;
      }
      // 三層都沒中：往下走，退回這一關的開頭
    } else if (currentId && rundownData.some((row) => keyOf(row) === currentId)) {
      // 還停在一個存在的位置（存檔已經還原過了）：什麼都不用做
      return;
    }

    if (currentId) onPositionLostRef.current?.();
    // 資料換過了，舊的軌跡指向的那些位置可能都不存在了，整條丟掉
    setHistory([]);

    // 退回這一關的開頭；找不到才回整場的開頭
    const missionStart = rundownData.find(
      (row) =>
        normId(row?.model) === 'MissionStart' &&
        normId(row?.missionId) === normId(currentMissionId)
    );
    setCurrentId(keyOf(missionStart) ?? firstKey);
  }, [rundownData, currentId, currentMissionId]);

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
    // 同時記「是誰」與「講了什麼」——創作者插一列之後，只有後者還算數
    localStorage.setItem(
      getStorageKey('currentId'),
      JSON.stringify(positionToSave(rundownData, currentId))
    );
  }, [currentId, rundownData]);

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
      getStorageKey('missionStartedAt'),
      JSON.stringify(missionStartedAt)
    );
  }, [missionStartedAt]);

  useEffect(() => {
    if (!gameId || previewMode) return;
    localStorage.setItem(
      getStorageKey('customPairs'),
      JSON.stringify(customPairs)
    );
  }, [customPairs]);

  // 前進／跳關一律走這裡，才記得下走過的路。
  // 直接 setCurrentId 的地方只剩「設起點」——那一列本來就不該進歷史。
  //
  // **走過的路是一條不重複的路徑，不是一步不漏的流水帳**（Dong 2026-08-28 回報）。
  // 回到一個路徑上已經有的列，就把路徑砍回那一次，而不是再往後接一段。
  //
  // 為什麼：demo 裡 a 有分支 b、d 走完會跳回 a，玩家在 a→b→d→a 之間繞三圈，流水帳
  // 版本就記下六格，往回滑要沿著那個圈退六次才出得來——而他要的是「a 之前那一頁」。
  // 瀏覽器的上一頁確實是流水帳（a→d→a→d 按返回就是來回），但這裡不是瀏覽器：
  // 「回上一頁」在故事裡的意思是回到剛才讀的，而繞回主線是玩家自己走出來的，
  // 他要的是離開不是重看。
  //
  // 代價講清楚：從支線走回主線之後，就**退不回那條支線**了（路徑上它已經被砍掉）。
  // 取捨的理由是不對稱——繞圈退不出去是每一次繞圈都會踩到的，而「想倒退回剛走完的
  // 支線」是罕見的，而且那條支線本來就還在流程上，往前走就會再遇到。
  const goToId = useCallback(
    (id) => {
      if (id === null || id === undefined || id === currentId) return;
      if (currentId !== null && currentId !== undefined) {
        setHistory((h) => {
          const seen = h.indexOf(id);
          // 繞回來了：把路徑砍回上次經過它的那一刻（那一格就是現在這一頁，不必留）
          if (seen >= 0) return h.slice(0, seen);
          return [...h, currentId];
        });
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
  // 抽出來是為了上下滑的預覽（上下滑翻頁）：往下拉時露出的那張卡片必須真的是待會會去的
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
    localStorage.removeItem(`${gameId}_missionStartedAt`);
    localStorage.removeItem(`${gameId}_customPairs`);

    // 重新整理瀏覽器
    window.location.reload();
  };

  // 記下玩家按「開始遊戲」進入這一關的時刻。
  //
  // **只記第一次。** 玩家往回翻一頁再走回來會再按一次，如果每次都覆寫，
  // 提示的倒數就被歸零了——而他其實已經在這一關卡了很久。
  const startMission = (missionId) => {
    if (missionId === undefined || missionId === null) return;
    setMissionStartedAt((prev) =>
      prev[missionId] ? prev : { ...prev, [missionId]: Date.now() }
    );
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
        missionStartedAt,
        startMission,
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
  imgBase: PropTypes.string,
  imgLookup: PropTypes.func,
  onPositionLost: PropTypes.func,
};
