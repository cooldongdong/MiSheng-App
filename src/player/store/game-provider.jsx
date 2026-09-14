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
import {
  clearEvents,
  FLUSH_MS,
  flushEvents,
  readEvents,
  recordEvent,
} from '../game/telemetry';
import { hintKeyOf } from '../game/hintTimer';


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
  // 切換底部導覽列的分頁。**狀態不歸 provider 所有**——它住在 GameShell 的
  // useState，這裡只當傳聲筒。
  //
  // 為什麼要繞這一圈：GameShell 是 <GameProvider> 的**外層**，讀不到自己提供的
  // context，而需要切頁的是 provider 底下的 MissionPage（跳關之後要跳去解謎頁）。
  // 把 setter 往下遞是最小的作法；把分頁索引整個搬進 provider 會讓「玩家在看哪一頁」
  // 變成遊戲狀態的一部分，而它不是——它是外框的事（見 COO-185 的播放器／宿主分界）。
  goToTab = null,
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
  // **空的 id 永遠對不到關卡。**
  //
  // `currentMissionId === ''` 的意思是「玩家不在任何一關」（封面）。但 CSV 檔尾
  // 只要多一個換行，papaparse 就會產出一列 `{ id: '' }`（其餘欄位是 undefined），
  // 於是 `String('') === String('')` 命中，這個函式會回傳一個**看起來存在、實際上
  // 每一格都是 undefined 的關卡**。
  //
  // 後果是整棵樹當場卸載：MissionStartModel 的 `currentMission ? … : null` 守衛
  // 因此放行，下一行 `currentMission.subtitle.length` 就丟 TypeError，畫面全白
  //（Dong 2026-09-11 在桌機、2026-09-12 在手機各回報一次，是同一個 bug）。
  //
  // **不在載入時把空列濾掉**，雖然那樣更乾淨：keyOf 對沒有 id 的列是用物理列號
  // （`#3`），濾掉任何一列都會讓後面所有列的 key 位移，玩家的存檔會跟著跑掉。
  // 所以擋在查找這一層——空的 id 本來就不該匹配到任何東西。
  const getMissionById = useCallback(
    (id) =>
      normId(id) === ''
        ? null
        : (missionData.find((m) => normId(m.id) === normId(id)) ?? null),
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

  // 記一則玩家行為。**previewMode（/create）不記**——那邊的進度本來就不寫
  // localStorage，而創作者自己反覆試玩的資料混進去只會把真玩家的樣本弄髒。
  //
  // 包一層而不是讓各元件自己 import telemetry：gameId 與 previewMode 這兩道
  // 守門只寫在這裡一次，新增呼叫點的人就不會漏掉其中一道。
  const record = useCallback(
    (type, detail) => {
      if (!gameId || previewMode) return;
      setEventCount(recordEvent(gameId, type, detail));
    },
    [gameId, previewMode]
  );

  // 這一局的第一則事件。用「還沒有任何事件」判斷而不是「元件掛載」，
  // 否則玩家每重整一次就多一筆 game_start，完賽率會被灌水。
  useEffect(() => {
    if (!gameId || previewMode) return;
    const existing = readEvents(gameId).length;
    if (existing > 0) {
      setEventCount(existing);
      return;
    }
    setEventCount(recordEvent(gameId, 'game_start'));
  }, [gameId, previewMode]);

  // 把還沒送出去的事件交給創作者的 Apps Script（config.recordUrl）。
  //
  // **三個觸發點，各自負責一種情況：**
  //
  //   1. 掛載時先送一次——上一次沒送完的（離線、當掉、直接關掉分頁）在這裡補上
  //   2. 每 FLUSH_MS 一次——正常玩的時候持續送出去，不要積在裝置上
  //   3. 分頁被藏起來／被關掉時用 sendBeacon——**那一刻只剩它送得出去**，
  //      fetch 會隨著分頁一起被中止
  //
  // 第 3 點是整個設計最重要的一環：實境遊戲的結束方式通常不是「按了完成」，
  // 是玩家直接把分頁關掉走人。
  //
  // previewMode（/create）不送：創作者自己反覆試玩的資料會把真玩家的樣本弄髒，
  // 跟 record 那邊是同一道守門。
  useEffect(() => {
    if (!gameId || previewMode) return;
    const url = normId(configData?.[0]?.recordUrl);
    if (!url) return;

    const onHide = () => flushEvents(gameId, url, { beacon: true });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };

    flushEvents(gameId, url);
    const timer = setInterval(() => flushEvents(gameId, url), FLUSH_MS);
    document.addEventListener('visibilitychange', onVisibility);
    // pagehide 比 unload 可靠（iOS 上 unload 常常不會觸發），而且它是
    // sendBeacon 明文支援的時機
    window.addEventListener('pagehide', onHide);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [gameId, previewMode, configData]);

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
  // 初始值是 ''＝「還不在任何一關」，不是 '0'。
  //
  // '0' 是舊資料的封面關編號（mission 表裡一列 id=0 的假關卡）。把它當初始值，
  // 等於對每一份遊戲斷言「開場時你在第 0 關」——而那只對「剛好有 mission 0」
  // 的遊戲成立。新遊戲的封面是 GameStart，沒有任何關卡。
  //
  // 舊存檔不受影響：存的是 '0' 就照樣讀回 '0'，舊遊戲指得到 mission 0，行為不變。
  const [currentMissionId, setCurrentMissionId] = useState('');
  // 上一次同步時玩家在哪一列。只給上面那個「走到封面才清空關卡」的判斷用——
  // 用來把「玩家自己走過去」跟「還原過程中的短暫落點」分開。
  const prevIdRef = useRef(null);
  const [unlockedHints, setUnlockedHints] = useState({});
  // 玩家按下每一關 MissionStart 的「開始遊戲」的時刻（epoch ms），用來算 hint.timer。
  //
  // 存**絕對時間**而不是累計秒數：這是戶外實境遊戲，玩家會鎖螢幕、走路、接電話，
  // 而「卡了三分鐘就該給提示」講的是牆上時鐘，不是螢幕亮著的時間。
  const [missionStartedAt, setMissionStartedAt] = useState({});
  const [customPairs, setCustomPairs] = useState({});
  // 這一局記了幾則行為事件。只拿來決定「下載紀錄」那顆鈕要不要出現——
  // 讓它自己每次 render 去讀一次 localStorage 並 JSON.parse 太浪費。
  const [eventCount, setEventCount] = useState(0);
  // 現在有幾個東西正蓋滿畫面（放大的圖、Camera 道具）。
  //
  // 用計數而不是布林：兩個疊在一起時，先關掉的那個不可以把導覽列放回來。
  // **為什麼要有這個狀態**：全螢幕的東西活在 #main-container（z-index 550＋
  // transform）的堆疊脈絡裡，對外只值 550，永遠壓不過導覽列的 700——擋住它
  // 的唯一辦法是讓 GameShell 自己不要畫。
  const [overlayCount, setOverlayCount] = useState(0);
  // 全螢幕看圖時，介面（縮小鈕、左上品牌標、右上那排按鈕）顯不顯示。
  // **放在這裡而不是 ZoomableImage 裡面**：點一下要讓三個角落一起消失，
  // 而那三個東西分屬不同的元件樹，只能靠共用狀態同步。
  const [overlayChromeVisible, setOverlayChromeVisible] = useState(true);
  const openOverlay = useCallback(() => setOverlayCount((n) => n + 1), []);
  const closeOverlay = useCallback(
    () => setOverlayCount((n) => Math.max(0, n - 1)),
    []
  );

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
    // 用 ?? 不是 ||：'' 是一個有意義的值（玩家存檔時人在封面上），
    // 用 || 會把它換成 '0'，也就是把「不在任何一關」誤讀成「在第 0 關」。
    setCurrentMissionId(
      localStorage.getItem(getStorageKey('currentMissionId')) ?? ''
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
    // 行為紀錄與 sid 一起清掉——留著的話新的一局會被算成舊的那一場
    clearEvents(gameId);

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
    // **每一次按都記**，不是只記第一次。上面那個「只記第一次」是給提示倒數用的
    // （回頭再進來不該把計時歸零）；而「他回頭重看了一次關卡說明」本身就是一件
    // 值得知道的事——存事件不存結論，要不要合併留給分析的時候決定。
    record('mission_start', { missionId });
  };

  // 更新提示的開啟狀態。
  //
  // **source 決定記成哪一種事件，而那是兩件不同的事、不是同一件事的兩個變體。**
  //   'manual' → hint_unlock       玩家自己按了「確定」——他承認自己需要幫忙，
  //                                所以那顆確認鈕的摩擦是刻意的。卡關的直接證據。
  //   'auto'   → hint_auto_unlock  時間到、安全網開了。所有「在這一關待夠久又打開過
  //                                提示頁」的人都會觸發，不管他需不需要——甚至可能
  //                                是他已經解開之後才好奇點進去看的。
  //
  // 混成同一個事件的話，報表會**系統性地高估卡關程度**，而且資料看起來是完整的
  // （每次解鎖都有一筆），所以沒有人會去懷疑那個數字（Dong 2026-09-14 發現）。
  // 9/02 定 timer 時就分清楚這兩者了，但那個判斷只寫進了設計，沒寫進資料。
  //
  // **為什麼是兩種事件型別，不是多一個欄位。** 事件 schema 只有 {missionId, value}
  // 兩格，而 value 已經拿去裝「第幾則」；加第三格要動整條管線（播放器 → Apps Script
  // → 試算表欄位 → 報表），而換 type 只要改報表那一行——落地端是原樣寫入的。
  const UNLOCK_EVENT = { manual: 'hint_unlock', auto: 'hint_auto_unlock' };
  const unlockHint = (missionId, hintIndex, source = 'manual') => {
    // 記「第幾則」而不是內部的指紋鍵。指紋（`h:17k7sa6`）對引擎是對的——它讓解鎖
    // 狀態在創作者插入／搬動提示之後仍然對得上——但**這批資料是要交出去給人看的**，
    // 而創作者打開試算表只認得「解鎖提示 2」。跟畫面上的編號對齊，才有辦法讀。
    //
    // 篩選條件跟 HintPage 一樣（同一關的提示，照表裡的順序）。對不上就退回指紋，
    // 寧可難讀也不要漏記。
    const ordinal = (hintData || []).filter(
      (row) => row.missionId === missionId
    ).findIndex((row) => hintKeyOf(row) === hintIndex);
    // 漏傳 source 時退回 manual。**這個 fallback 的方向是刻意選的**：
    // 兩種錯都會讓數字偏，但「把自動記成手動」會高估卡關、讓人去改一個其實沒問題
    // 的關卡；反過來會低估、讓真的有問題的關卡被忽略。前者看得出來（改完發現
    // 沒差），後者不會。
    record(UNLOCK_EVENT[source] || UNLOCK_EVENT.manual, {
      missionId,
      value: ordinal >= 0 ? String(ordinal + 1) : hintIndex,
    });
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

  // 走到哪一列，關卡狀態就要跟到哪。
  //
  // **住在 provider，不在 GameController。** GameController 只在「解謎」那一個
  // 分頁掛載（見 GameShell 的 switch），但 currentId 在別的分頁一樣會變——
  // /create 的三欄畫面點右邊流程圖就會 goToId，中間欄停在哪一頁完全不受影響。
  // 放在 GameController 裡的話，停在提示分頁跳去別關，提示清單會一直是上一關的，
  // 直到有人切回解謎分頁才更新。
  //（Dong 2026-09-01 回報過這個症狀的一半——展開狀態沿用到新的一關。當時修的是
  //  HintPage 自己的 expandedHints，沒發現連 currentMissionId 都還沒跟上。）
  useEffect(() => {
    if (!Array.isArray(rundownData) || !Array.isArray(missionData)) return;
    const row = rundownData.find((item) => keyOf(item) === currentId);
    if (!row) return;

    // 封面＝玩家不在任何一關。這是**唯一**會清掉 currentMissionId 的地方，
    // 而且由 model 判斷，**不是由 missionId 空白判斷**——rundown 的 missionId
    // 空白代表「沿用上一關」，demo 有 481 列是這樣（關卡中間的每一句對白）。
    // 封面＝玩家不在任何一關。這是**唯一**會清掉 currentMissionId 的地方，
    // 而且由 model 判斷，**不是由 missionId 空白判斷**——rundown 的 missionId
    // 空白代表「沿用上一關」，demo 有 481 列是這樣（關卡中間的每一句對白）。
    //
    // ⚠️ **只有「從別的地方走過來」才算走到封面**（prevIdRef 的用途）。
    //
    // 位置還原時 currentId 會**短暫落在第一列**——上面那條 effect 的
    // `setCurrentId(keyOf(missionStart) ?? firstKey)`：還原順序上 currentMissionId
    // 可能還沒讀回來，於是找不到對應的 MissionStart，退回整場的開頭，而整場的開頭
    // 現在正是 GameStart。少了這道判斷，**玩家在關卡中重整就會被清掉關卡**，
    // 提示／道具／故事三頁跟著變空，而且要走到下一個 MissionStart 才會回來。
    //
    // 實測（2026-09-06）的 currentId 軌跡：`null → 1(GameStart) → 321(存檔的那一列)`。
    // 中間那一格是還原過程，不是玩家走過去的。
    if (normId(row.model) === 'GameStart') {
      const cameFromElsewhere =
        prevIdRef.current !== null && prevIdRef.current !== currentId;
      prevIdRef.current = currentId;
      if (cameFromElsewhere) setCurrentMissionId('');
      return;
    }
    prevIdRef.current = currentId;

    const mission = getMissionById(row.missionId);
    // missionId 空白＝沿用上一關（demo 有 481 列是這樣），不是「沒有關卡」
    if (!mission) return;
    setCurrentMissionId(mission.id);
    updateMissionStatus(mission.id, 'solving');
  }, [currentId, rundownData, missionData, getMissionById]);

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
        // 由 GameShell 往下遞（見上面 props 的說明）。沒有宿主提供時是 noop，
        // 這樣呼叫端不必每次都判斷有沒有。
        goToTab: goToTab ?? (() => {}),
        customPairs,
        updateCustomPairs,

        gameId,
        getImg,
        clearGameData,
        record,
        eventCount,
        overlayOpen: overlayCount > 0,
        openOverlay,
        closeOverlay,
        overlayChromeVisible,
        setOverlayChromeVisible,
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
  goToTab: PropTypes.func,
};
