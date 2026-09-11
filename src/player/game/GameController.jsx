import {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { GameContext } from '../store/game-context';
import { Box, useMediaQuery } from '@mui/material';
import KeyHintBar from '../component/common/KeyHintBar';
import { loadCSVData } from './csvLoader';
import { keyOf, normId } from '../../shared/rowKey';
import GameLoading from '../component/common/GameLoading';
import useNextId from '../hook/useNextId';
import usePrevId from '../hook/usePrevId';
import useFlowKeys from '../hook/useFlowKeys';
import useSwipeFlow from '../hook/useSwipeFlow';
import PeekPanel from '../component/common/PeekPanel';
import PageSlot from './PageSlot';
import PropTypes from 'prop-types'; // 引入 PropTypes

// 「按一下就走」的 model。**Article 也在裡面**——它是一整頁可捲的長文，
// 但「讀完才准走」是一道一定要繞過的門：擋不住想跳過的人，卻會逼我們再補一條
// 逃生規則（2026-09-07 新手導覽那次的教訓）。捲到底才翻頁的手感由 useSwipeFlow
// 負責，那是提示不是門。
const FORWARD_MODELS = new Set(['Talk', 'Img', 'MissionStart', 'GameStart', 'Article']);
// 要打字的兩種。游標落在框裡時方向鍵是移動游標，得先按 Esc 才拿得回來
// （輸入框本身不再自動 focus，但使用者點過就會）
const INPUT_MODELS = new Set(['MissionAnswerInput', 'CustomValueInput']);


const GameController = ({
  characterCsvFile,
  hintCsvFile,
  missionCsvFile,
  propCsvFile,
  rundownCsvFile,
  storyCsvFile,
  configCsvFile,
  dataVersion = 0,
  devTools = false,
}) => {
  const {
    setCharacterData,
    setHintData,
    setMissionData,
    setPropData,
    rundownData,
    setRundownData,
    setStoryData,
    setConfigData,

    loadedVersion,
    setLoadedVersion,
    currentId,
    setCurrentId,
    goToId,
    goBack,
    canGoBack,
    backId,
    playerMissionData,
    startMission,
    currentMissionId,
    missionStartedAt,
    // 只給 ?diag=1 的讀數用（見下方 render）
    missionData,
    getMissionById,
    mapMode,
    spatialNav,
    record,
  } = useContext(GameContext);
  // 目前這一列直接從 currentId 算，不再存成 state。
  //
  // 原本是 useState ＋ effect 回填，於是它永遠比 currentId 慢一個 render。
  // 用按鈕點的時候看不出來，但鍵盤長按（每秒約 30 次）會連續踩到同一個舊值：
  // 第二下算出的 nextId 還是第一下那個，goToId 看到「目標＝現在」就直接 return，
  // 於是按十下只走一格。推導值就該用 useMemo 推導，不該存起來。
  const currentRow = useMemo(() => {
    if (!Array.isArray(rundownData)) return null;
    return rundownData.find((item) => keyOf(item) === currentId) ?? null;
  }, [rundownData, currentId]);
  // 剛剛是用 ← 退回來的嗎——只為了在畫面上講一句「狀態沒跟著倒回來」
  const [wentBack, setWentBack] = useState(false);
  const { getNextId, canProceedToNext } = useNextId(rundownData, currentRow);
  const { getPrevId, canGoPrev } = usePrevId(rundownData, currentId);

  // 讀取該遊戲的資料表
  //
  // 什麼時候該重解析，由外面給的 dataVersion 決定（/create 就地重新讀取時 +1）。
  //   - 不能用 [] ＋「載過就跳過」：那樣新資料永遠進不來，只能靠整棵樹卸載重掛，
  //     而重掛會把玩家停在哪一列也一起歸零
  //   - 也不用 CSV 字串當 deps：切底部分頁時 GameController 會卸載重掛，
  //     只有版本號這種「掛在 Provider 上的記號」認得出「同一份資料不必再解一次」
  useEffect(() => {
    if (loadedVersion === dataVersion) {
      return;
    }
    let cancelled = false;
    const loadCsvFiles = async () => {
      try {
        const [
          characterData,
          hintData,
          missionData,
          propData,
          rundownData,
          storyData,
          configData,
        ] = await Promise.all([
          loadCSVData(characterCsvFile),
          loadCSVData(hintCsvFile),
          loadCSVData(missionCsvFile),
          loadCSVData(propCsvFile),
          loadCSVData(rundownCsvFile),
          loadCSVData(storyCsvFile),
          loadCSVData(configCsvFile),
        ]);
        // 解析途中被換掉或卸載了：這份結果已經過期，不要蓋上去
        if (cancelled) return;
        setCharacterData(characterData);
        setHintData(hintData);
        setMissionData(missionData);
        setPropData(propData);
        setRundownData(rundownData);
        setStoryData(storyData);
        setConfigData(configData);
        console.log('轉換 Csv 資料');
      } catch (error) {
        console.error('Error loading CSV files:', error);
        if (cancelled) return;
      }
      setLoadedVersion(dataVersion);
    };

    loadCsvFiles();
    return () => {
      cancelled = true;
    };
  }, [dataVersion, loadedVersion]);

  // 註：「走到哪一列，關卡狀態就跟到哪」以前在這裡，**已經搬進 game-provider**。
  // 搬家理由見那邊的註解——這個元件只在「解謎」分頁掛載，而 currentId 在別的
  // 分頁一樣會變。

  // 走到一列「沒有下一步」的地方＝流程的終點。
  //
  // 用 getNextId() 判斷而不是「是不是陣列最後一列」：nextId 可以跳，物理上的最後
  // 一列不一定是結局。Quiz 也不會誤判——它沒有自己的 nextId，但 getNextId 會給
  // 物理下一列，所以不是 null。
  //
  // **注意：這不是「完賽」的可靠訊號。** 實測 demo 根本不會走到這裡——它最後一列
  // 是 nextId=447 的 Quiz，流程繞回去了，沒有任何一列是死路。要算完賽率請看
  // 最後一關的 answer_right，那個才是玩家真的把遊戲玩完的證據。
  // 這一則的意義是「他走到了流程的盡頭」，只有寫成線性結局的遊戲才會有。
  const endedRef = useRef(false);
  useEffect(() => {
    if (!currentRow || endedRef.current) return;
    if (getNextId()) return;
    endedRef.current = true;
    record('game_end', { missionId: currentRow.missionId });
  }, [currentRow, getNextId, record]);

  // Quiz 的選項＝以這一列為 parentId 的那些 row（跟 QuizModel 的算法一致）。
  // 這裡也算一次，是為了讓數字鍵不必等 QuizModel 把它算好再往上傳。
  const quizOptions = useMemo(() => {
    if (currentRow?.model !== 'Quiz' || !Array.isArray(rundownData)) return [];
    return rundownData.filter((row) => normId(row.parentId) === currentId);
  }, [currentRow, rundownData, currentId]);

  // 這一頁能不能用 down 鍵前進。
  //
  // 「按一下就走」的三種 model 可以；Quiz 要選分支、兩種輸入頁要打字，不行——
  // 「按了沒反應」與「按了會作弊」是兩種都不想要的困惑，不攔就只剩前者，
  // 而且是使用者看畫面就懂的那一種。
  //
  // 例外是答對之後的 MissionAnswerInput：那時畫面上顯示的已經是 Next 按鈕，
  // 這一頁實質上就是「按一下就走」了，鍵盤跟著能走才不會前後矛盾。
  const canAdvance = useMemo(() => {
    if (!canProceedToNext()) return false;
    const model = currentRow?.model;
    if (FORWARD_MODELS.has(model)) return true;
    if (model !== 'MissionAnswerInput') return false;
    return playerMissionData.some(
      (item) =>
        String(item.id) === String(currentRow?.missionId) &&
        item.status === 'complete'
    );
  }, [currentRow, canProceedToNext, playerMissionData]);

  const handlePickOption = useCallback(
    (index) => {
      const option = quizOptions[index];
      if (!option) return;
      // 選項也可以是外連（OptionButtons 會把它畫成 href），數字鍵就等同點它
      if (option.url) {
        window.open(option.url, '_blank', 'noopener');
        return;
      }
      if (option.nextId) {
        setWentBack(false);
        goToId(option.nextId);
      }
    },
    [quizOptions, goToId]
  );

  const handleNext = useCallback(() => {
    const nextId = getNextId();
    if (nextId) {
      // 從關卡說明頁往前走＝這一關真正開始（hint.timer 的計時起點）。
      //
      // **為什麼掛在這裡，不掛在「開始遊戲」那顆按鈕上。** 本來是掛在按鈕上的，
      // 理由沒錯——說明頁可能停很久（讀說明、看導航連結），那段時間不該算進倒數。
      // 錯的是它把「玩家往前走了」綁在**其中一種**走法上：MissionStart 在
      // FORWARD_MODELS 裡，本來就可以用滑的翻過去，而滑過去的人計時永遠不啟動，
      // 這一關的 hint.timer 從此形同沒填，畫面上完全看不出原因
      //（Dong 2026-09-06 回報）。
      //
      // handleNext 是「往前走進下一頁」的唯一入口——按鈕、上滑、鍵盤 ↓ 都走它，
      // 所以掛在這裡三種走法一次到齊，而時間點跟原本的按鈕完全一樣。
      //
      // **刻意不涵蓋「離開但沒進去」**：⌫／下滑（handleBack）、鍵盤 ↑（handlePrev）、
      // 地圖模式方向鍵（handleMove）、流程圖跳走、關卡頁十連點跳到別關——
      // 那些都不是進到這一關。站在第三關說明頁跳去第五關，第三關的倒數不該開始跑。
      if (currentRow?.model === 'MissionStart' && currentRow.missionId) {
        startMission(currentRow.missionId);
      } else if (currentMissionId && !missionStartedAt?.[currentMissionId]) {
        // 安全網：人已經在某一關裡，但那一關從來沒有起算過時間。
        //
        // 接的是「沒有經過 MissionStart 就進到關卡中段」的路徑：/create 點流程圖
        // 直接跳到某一列、地圖模式用方向鍵走過去、或創作者用 nextId 跳關。
        // 那些路徑不經過上面那一條，計時會永遠不啟動——而那正是本來的病。
        //
        // **也放在 handleNext，不放在 provider 的同步 effect 裡。** 放那邊的話它會在
        // 元件掛載期間就開火，跟「從 localStorage 還原存檔」那條 effect 搶時序：
        // 實測會出現「安全網寫進去了，然後還原把它蓋回空的」。放這裡就只在使用者
        // 真的走一步時才跑，掛載期間不會有動作。
        startMission(currentMissionId);
      }
      setWentBack(false);
      goToId(nextId); // 設定下一個 ID（走 goToId 才記得下走過的路）
    }
  }, [getNextId, goToId, currentRow, startMission, currentMissionId, missionStartedAt]);

  const handleBack = useCallback(() => {
    if (goBack()) setWentBack(true);
  }, [goBack]);

  // ↑ 走圖上的上一步。它也算「走了一步」，所以照樣進歷史——
  // 這樣 ↑ 過頭之後 Backspace 還回得來。
  const handlePrev = useCallback(() => {
    const prevId = getPrevId();
    if (!prevId) return;
    setWentBack(true);
    goToId(prevId);
  }, [getPrevId, goToId]);

  // 地圖模式：往某個方向走到圖上相鄰的那一顆。走過的路照樣記，所以 ⌫ 一樣退得回來。
  // 回傳有沒有真的走成，讓鍵盤那邊能把「這個方向沒有東西」講出來
  const handleMove = useCallback(
    (direction) => {
      const target = spatialNav?.(currentId, direction);
      if (!target || target === currentId) return false;
      setWentBack(false);
      goToId(target);
      return true;
    },
    [spatialNav, currentId, goToId]
  );

  // 主要輸入是不是觸控。**判準是裝置，不是入口**（Dong 2026-08-28）：
  // 在手機上打開 /create 試玩時，那裡既沒有鍵盤、也沒有三欄可以拖——鍵盤提示是純雜訊，
  // 而滑動才是唯一自然的翻頁方式。原本這兩件事都綁在 devTools 上，等於拿
  // 「你從哪個網址進來」去回答「你手上有什麼」。
  const coarsePointer = useMediaQuery('(pointer: coarse)');

  // 上下滑＝按鈕的捷徑（Dong 2026-08-28 拍板）。上滑等同按 Next、
  // 下滑等同 ⌫，判準與鍵盤共用同一個 canAdvance——同一件事只能有一條規則，
  // 否則「按鈕會走、滑不動」這種前後矛盾會被當成壞掉。
  //
  // 只在玩家端（devTools=false＝/demo 與各自部署的遊戲）。/create 是桌機三欄工具，
  // 那邊的前進後退是鍵盤（鍵盤翻頁），再疊一套手勢只會跟拖曳分隔線打架。
  // 「往下拉會去哪一列」。backId 是 goBack 真正會落到的那一列（provider 算的，
  // 跟 goBack 同一條規則）；沒有走過的路時退到流程上的上一步——history 不寫
  // localStorage，玩家一重整就沒有走過的路，沒有這條 fallback 的話下滑會變成
  // 「有時候整個消失」的手勢，那比沒有還糟。
  const backTargetId = backId || getPrevId();

  const handleSwipeBack = useCallback(() => {
    if (backId) {
      handleBack();
      return;
    }
    // 走過的路用完了，就退到流程上的上一步。**這一步不進歷史**——往回走不該在路徑上
    // 留下新的一格，否則下一次往回只是把它撤銷，畫面就在兩頁之間來回彈
    // （Dong 2026-08-28 回報繞圈問題時一起浮出來的：15 ↔ 12 跳個不停）。
    // 這裡不能借 handlePrev：那是 /create 的鍵盤 ↑，它刻意要進歷史，
    // 好讓 ⌫ 在按過頭之後還回得來。同一個動作在工具與玩家端要的東西不一樣。
    const prevId = getPrevId();
    if (!prevId) return;
    setWentBack(true);
    setCurrentId(prevId);
  }, [backId, handleBack, getPrevId, setCurrentId]);

  const swipe = useSwipeFlow({
    enabled: !devTools || coarsePointer,
    canAdvance,
    onNext: handleNext,
    canGoBack: !!backTargetId,
    onBack: handleSwipeBack,
  });

  // 拉開之後那塊空間要放什麼。走得過去＝真的把那一頁畫出來；走不過去＝為什麼。
  //
  // 「為什麼」的判斷順序有講究：Quiz 這一列的物理下一列是它自己的第一個選項，所以
  // canProceedToNext() 對 Quiz 是 true——先問 model 再問有沒有下一列，順序反過來
  // 就會對著 Quiz 說「這是最後一頁」。
  const peekContent = useMemo(() => {
    if (!swipe.peek) return null;
    const { dir, blocked } = swipe.peek;

    if (!blocked) {
      const targetId = dir === 'up' ? getNextId() : backTargetId;
      const row = rundownData?.find?.((item) => item.id === targetId);
      if (!row) return null;
      // 拉的途中：往回＝已經看過，整頁給；往前＝還沒發生，內容先藏著。
      // 放手之後（committing）一律整頁給——他已經要過去了，這時還藏著只會讓
      // 「滑完才補上內容」變成一次閃爍。
      const committed = !!swipe.peek.committing;
      return {
        dir,
        kind: 'page',
        row,
        // 藏的只是「內容」，底圖與立繪照畫——而且藏與不藏是同一棵樹的同一個 prop，
        // 放手那一刻不會重新掛載（見 PeekPage 檔頭）
        hideContent: dir === 'up' && !committed,
        // 往回那一頁直接給全文（已經讀過了）；正在滑過來的那一頁先不要有字——
        // 它落地後會變成當前頁、從第一個字開始打，先放字反而會先消失再重打。
        textMode: dir === 'down' ? 'instant' : 'silent',
      };
    }

    if (dir === 'down') {
      return { dir, kind: 'blocked', label: '這裡是起點', detail: '前面沒有了' };
    }

    const model = currentRow?.model;
    if (model === 'Quiz') {
      return { dir, kind: 'blocked', label: '要先選一個選項', detail: '選了才知道故事往哪走' };
    }
    if (model === 'MissionAnswerInput') {
      return { dir, kind: 'blocked', label: '要先答對這一關', detail: '答案填在上面那格' };
    }
    if (model === 'CustomValueInput') {
      return { dir, kind: 'blocked', label: '要先填好上面那格', detail: null };
    }
    if (!canProceedToNext()) {
      return { dir, kind: 'blocked', label: '這裡是終點', detail: '後面沒有了' };
    }
    return { dir, kind: 'blocked', label: '這一頁還不能往下', detail: null };
  }, [
    swipe.peek,
    getNextId,
    backTargetId,
    rundownData,
    currentRow,
    canProceedToNext,
  ]);

  // 沒有流程圖就沒有地圖模式（/demo 就是這樣）——spatialNav 是 null 時整個關掉
  const mapNav = devTools && mapMode && !!spatialNav;

  useFlowKeys({
    mapMode: mapNav,
    onMove: handleMove,
    canAdvance,
    onNext: handleNext,
    onPrev: handlePrev,
    canGoPrev: canGoPrev(),
    goBack: handleBack,
    canGoBack,
    devTools,
    optionCount: quizOptions.length,
    onPickOption: handlePickOption,
    model: currentRow?.model,
  });

  // 資料還沒解析完、或位置還沒決定好。**這是玩家進遊戲真正會看到的那一格**
  //（GameShell 那道守門只擋到「檔案抓回來了沒」，CSV 解析與存檔還原都在這之後），
  // 所以它跟開場畫面用同一份骨架，不是一行英文字。
  if (!rundownData || !Array.isArray(rundownData) || !currentRow) {
    return <GameLoading />;
  }

  // 遊戲欄頂端那一列的內容。回退後的但書優先——那一刻要講的是
  // 「狀態沒跟著倒回」，不是還有哪些鍵可以按。
  //
  // 每一頁只講這一頁真的能按的東西——不能前進的頁面寫「↑↓ 翻頁」，等於叫人去按
  // 一個不會有反應的鍵，那正是這整條規則想避免的困惑。
  // 提示列要說哪一種。**只傳種類、不傳句子**——句子裡的 ↑↓⌫ 只能是 Unicode 字元，
  // 而那些字的寬高在不同字型裡差很多；畫成什麼樣子交給 KeyHintBar 用 icon 決定。
  //
  // 沒有流程圖就不出這一列：/demo 本來就沒有，/create 收起右欄時也一樣——
  // 那時使用者是想專心看遊戲，一行鍵盤提示只是雜訊（鍵盤功能本身還在）。
  // 觸控裝置上也不出：那裡根本按不到那些鍵。
  const hintKind = !devTools || coarsePointer || !spatialNav
    ? null
    : mapNav
      ? 'map'
      : wentBack
        ? 'wentBack'
        : quizOptions.length > 0
          ? 'quiz'
          : INPUT_MODELS.has(currentRow?.model) && !canAdvance
            ? 'input'
            : canAdvance
              ? 'flow'
              : 'back';

  // Render content based on the model type
  // 現在這一頁 ＋ 上／下相鄰的那一頁，排成一列，**用 row.id 當 key**。
  //
  // key 是這整段的重點：滑過去的時候 currentId 換人，但原本那張預覽的 key 沒變，
  // 所以 React 認得它是同一個元素——只是 live 從 false 變 true、位置從 +100% 回到 0。
  // 沒有卸載、沒有重掛，圖片與打字機的狀態原封不動。
  // 交接過一次就會閃一下，成因見 PageSlot 檔頭。
  // 不用 useMemo：它坐在「資料還沒好就先 return」那幾道守門之後，而 hook 不能有
  // 條件地呼叫。這裡只是組兩筆物件，本來也不值得記憶化——真正省事的是 key。
  const slots = [{ row: currentRow, pos: 0, live: true }];
  if (peekContent?.kind === 'page') {
    slots.push({
      row: peekContent.row,
      pos: peekContent.dir === 'up' ? 1 : -1,
      live: false,
      hideContent: peekContent.hideContent,
      textMode: peekContent.textMode,
    });
  }

  return (
    <>
      {/* **?diag=1 的現場讀數。** 只在 dev、只在網址帶了 diag 時出現。
          存在的理由寫在 insights 2026-09-06：回饋管道一旦跨了一個人、一台裝置，
          「改一個東西再問一次好了沒」每一輪只值一位元的資訊，而做一次量測工具
          換掉的是對方的時間。這次要分辨的是三種在手機上長得一模一樣的失敗——
          render 丟例外（全白）、某個分支渲染了 null（空卡片）、白字畫在白底上。 */}
      {import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('diag') && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 99998,
              bgcolor: 'rgba(0,0,0,0.82)',
              color: '#9ef',
              font: '11px/1.5 ui-monospace, Menlo, monospace',
              p: 0.75,
              whiteSpace: 'pre-wrap',
              pointerEvents: 'none',
            }}
          >
            {[
              `currentId=${JSON.stringify(currentId)}`,
              `model=${JSON.stringify(currentRow?.model)}`,
              `row.missionId=${JSON.stringify(currentRow?.missionId)}`,
              `currentMissionId=${JSON.stringify(currentMissionId)}`,
              `mission=${JSON.stringify(getMissionById(currentMissionId)?.title ?? null)}`,
              `missionData=[${(missionData || []).map((m) => JSON.stringify(m.id)).join(',')}]`,
              `rundown=${(rundownData || []).length}列 coarse=${coarsePointer}`,
            ].join('  ')}
          </Box>
        )}
      <KeyHintBar kind={hintKind} />
      {/* 滑動的舞台。外層是不動的視窗（把上下相鄰的那兩頁裁在畫面外），內層是跟著
          手指走的那一層——一個 transform 同時帶著三頁，各頁就不必自己算位置。
          GameShell 那層本來就是 flex ＋ 垂直置中，每一格要把同一組版面規則照抄一次——
          不抄的話 ImgModel 的 m:'auto' 會失去垂直置中的依據，圖片整個貼到上緣。
          transform 只在真的在動的時候才給（style 裡是 undefined），因為有 transform
          的元素會變成底下所有 fixed 後代的定位基準，而外層又是 overflow:hidden——
          靜止時保持沒有 transform，放大的圖才不會被裁掉。 */}
      <Box
        ref={swipe.containerRef}
        onPointerDown={swipe.onPointerDown}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          // 垂直拖曳是翻頁，不是捲動——**這一行不加，Android 上根本翻不了頁。**
          //
          // touch-action 沒宣告時，瀏覽器一超過判定門檻就把觸控收去當捲動並發
          // pointercancel，即使畫面上根本沒東西可捲。useSwipeFlow 檔頭那句
          // 「瀏覽器自己會在原生捲動開始的瞬間發 pointercancel 把手勢收走」講的就是它。
          // iOS Safari 收得晚、Android Chrome 收得早，所以只有 Android 壞掉。
          //
          // 在 Dong 的 Android 9 上實測過三種情況（診斷頁）：
          //   沒有 touch-action → 被 cancel（重現）
          //   touch-action: none → 手勢完整走完
          //   none 的容器裡放一個自己宣告 pan-y 的可捲清單 → 清單照樣捲得動
          // 第三項是重點：**後代宣告 pan-y 加得回來**，所以下面那三個可捲區
          // （ContentList／TalkText／QuestionText）各自宣告就行，不必為它們放棄這一行。
          //
          // ⇒ **在這底下新增任何 overflow 可捲的區塊，都要明講它的 touch-action**，
          // 否則它在觸控裝置上會捲不動，而且畫面上看不出原因。二選一：
          //   pan-y — 瀏覽器管它的捲動（有慣性）。代價是**手勢整段歸瀏覽器、
          //           不會中途交還**，所以在那塊區域上永遠翻不了頁。長清單適合。
          //   none  — 由 useSwipeFlow 自己捲，捲到底再把剩下的位移轉成翻頁。
          //           沒有慣性，適合只溢出一點的小框（對白框走這條）。
          //
          // 曾經改成「全螢幕時放開，讓瀏覽器接手雙指縮放」，但那會**連介面一起放大**
          //（瀏覽器縮放的是整個頁面）。改成放大的圖自己接管所有觸控之後，這裡就該
          // 維持 none——不要讓瀏覽器也插一腳。
          touchAction: 'none',
          // **這一層不要上底色。** 一度鋪過 dialogue.surface 當「露縫時不要白閃」的保險，
          // 但那反而製造了真正的 bug：Img 沒有色層、MissionStart 是一張 MUI Paper 白卡，
          // 這兩種頁面的底本來就是 GameShell 的 game.bg（淺色下近白），鋪深色等於把它們
          // 的底整個換掉（Dong 2026-08-28 回報）。
          // 保險也不需要了——換頁滑滿一個容器高度，位移落在 [-h, 0]，兩頁合起來一定
          // 蓋滿視窗，沒有露縫的那一格。
        }}
      >
        {/* data-tour：新手導覽示範上下滑時，要讓這一層跟著動——
            那是「這個手勢會做什麼」唯一講得清楚的方式（見 common/OnboardingTour）。
            導覽只下 CSS 動畫，不碰遊戲狀態，所以位置動完就回到原處。 */}
        <Box
          data-tour="stage"
          style={swipe.style}
          sx={{ position: 'absolute', inset: 0 }}
        >
          {slots.map((slot) => (
            <Box
              // 對白列的 id 可以留空，兩個相鄰的無名列會拿到同一個 undefined——
              // 而 slots 管的正是換頁動畫中的前後頁，接錯會把上一頁留在畫面上
              key={keyOf(slot.row)}
              // inert：預覽那一頁裡有真的輸入框與按鈕。整棵子樹不可聚焦也不可互動，
              // 所以 Tab 不會走進去、按鈕按不到，未來哪個元件又加了 autoFocus 也搶不走
              // 玩家的游標。它是 attribute，切換不會讓 React 重掛這棵樹。
              // React 18 不認 inert 這個 prop（19 才支援布林），用空字串繞過型別檢查——
              // 瀏覽器看到屬性存在就生效。
              {...(slot.live ? {} : { inert: '' })}
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: slot.live ? undefined : 'none',
                // 當前頁不給 transform（理由同上：fixed 後代的定位基準）
                transform: slot.pos ? `translateY(${slot.pos * 100}%)` : undefined,
              }}
            >
              <PageSlot
                row={slot.row}
                live={slot.live}
                hideContent={!slot.live && !!slot.hideContent}
                // 往回走到的那一頁直接給全文。它剛剛在預覽裡就是全文，落地再從頭打
                // 一次等於字先消失再重來；而且那一頁玩家本來就讀過了，重打是倒帶
                // 不是回顧。
                textMode={
                  slot.live ? (wentBack ? 'instant' : 'type') : slot.textMode
                }
                onNext={handleNext}
                canProceed={canProceedToNext()}
                devTools={devTools}
              />
            </Box>
          ))}

          {peekContent?.kind === 'blocked' && (
            <Box
              {...{ inert: '' }}
              sx={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                ...(peekContent.dir === 'up'
                  ? { top: '100%' }
                  : { bottom: '100%' }),
              }}
            >
              <PeekPanel
                dir={peekContent.dir}
                label={peekContent.label}
                detail={peekContent.detail}
                blocked
              />
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

// 定義 propTypes
GameController.propTypes = {
  characterCsvFile: PropTypes.string.isRequired,
  hintCsvFile: PropTypes.string.isRequired,
  missionCsvFile: PropTypes.string.isRequired,
  propCsvFile: PropTypes.string.isRequired,
  rundownCsvFile: PropTypes.string.isRequired,
  storyCsvFile: PropTypes.string.isRequired,
  configCsvFile: PropTypes.string.isRequired,
  dataVersion: PropTypes.number,
  devTools: PropTypes.bool,
};

export default GameController;
