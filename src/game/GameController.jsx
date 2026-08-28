import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { GameContext } from '../store/game-context';
import { Box, Typography } from '@mui/material';
import KeyHintBar from '../component/common/KeyHintBar';
import { loadCSVData } from './csvLoader';
import useNextId from '../hook/useNextId';
import usePrevId from '../hook/usePrevId';
import useFlowKeys from '../hook/useFlowKeys';
import useSwipeFlow from '../hook/useSwipeFlow';
import PeekPanel from '../component/common/PeekPanel';
import PeekPage from './PeekPage';
import { MODEL_COMPONENTS } from './models';
import PropTypes from 'prop-types'; // 引入 PropTypes

// 「按一下就走」的三種 model
const FORWARD_MODELS = new Set(['Talk', 'Img', 'MissionStart']);
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
    missionData,
    setMissionData,
    setPropData,
    rundownData,
    setRundownData,
    setStoryData,
    setConfigData,

    loadedVersion,
    setLoadedVersion,
    currentId,
    goToId,
    goBack,
    canGoBack,
    backId,
    setCurrentMissionId,
    updateMissionStatus,
    playerMissionData,
    mapMode,
    spatialNav,
  } = useContext(GameContext);
  // 目前這一列直接從 currentId 算，不再存成 state。
  //
  // 原本是 useState ＋ effect 回填，於是它永遠比 currentId 慢一個 render。
  // 用按鈕點的時候看不出來，但鍵盤長按（每秒約 30 次）會連續踩到同一個舊值：
  // 第二下算出的 nextId 還是第一下那個，goToId 看到「目標＝現在」就直接 return，
  // 於是按十下只走一格。推導值就該用 useMemo 推導，不該存起來。
  const currentRow = useMemo(() => {
    if (!Array.isArray(rundownData)) return null;
    return rundownData.find((item) => item.id === currentId) ?? null;
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

  // 走到哪一列，關卡狀態就要跟到哪
  useEffect(() => {
    if (!currentRow) return;

    const mission = missionData.find(
      (mission) => mission.id === currentRow.missionId
    );
    if (mission) {
      setCurrentMissionId(mission.id);
      updateMissionStatus(mission.id, 'solving');
    } else {
      console.log('這頁沒有 missionId');
    }
  }, [currentRow, missionData]);

  // Quiz 的選項＝以這一列為 parentId 的那些 row（跟 QuizModel 的算法一致）。
  // 這裡也算一次，是為了讓數字鍵不必等 QuizModel 把它算好再往上傳。
  const quizOptions = useMemo(() => {
    if (currentRow?.model !== 'Quiz' || !Array.isArray(rundownData)) return [];
    return rundownData.filter((row) => row.parentId === currentId);
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
      setWentBack(false);
      goToId(nextId); // 設定下一個 ID（走 goToId 才記得下走過的路）
    }
  }, [getNextId, goToId]);

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

  // 上下滑＝按鈕的捷徑（COO-135，Dong 2026-08-28 拍板）。上滑等同按 Next、
  // 下滑等同 ⌫，判準與鍵盤共用同一個 canAdvance——同一件事只能有一條規則，
  // 否則「按鈕會走、滑不動」這種前後矛盾會被當成壞掉。
  //
  // 只在玩家端（devTools=false＝/demo 與各自部署的遊戲）。/create 是桌機三欄工具，
  // 那邊的前進後退是鍵盤（COO-134），再疊一套手勢只會跟拖曳分隔線打架。
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
    handlePrev();
  }, [backId, handleBack, handlePrev]);

  const swipe = useSwipeFlow({
    enabled: !devTools,
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
      // 往回＝已經看過，整頁給；往前＝還沒發生，只給底圖（見 PeekPage 檔頭）
      return { dir, kind: 'page', row, mode: dir === 'down' ? 'full' : 'background' };
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

  if (!rundownData || !Array.isArray(rundownData)) {
    return <Typography>Loading data...</Typography>;
  }

  if (!currentRow) {
    return <Typography>Loading...</Typography>;
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
  const hintKind = !devTools || !spatialNav
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
  const renderContent = () => {
    const ModelComponent = MODEL_COMPONENTS[currentRow.model];
    return ModelComponent ? (
      <ModelComponent
        currentRow={currentRow}
        onNext={handleNext}
        canProceed={canProceedToNext()}
        devTools={devTools}
      />
    ) : (
      <Typography>Unknown model type: {currentRow.model}</Typography>
    );
  };

  return (
    <>
      <KeyHintBar kind={hintKind} />
      {/* 滑動的舞台。GameShell 那層本來就是 flex ＋ 垂直置中，這個 Box 是插進
          中間的，所以要把同一組版面規則照抄一次——不抄的話 ImgModel 的 m:'auto'
          會失去垂直置中的依據，圖片整個貼到上緣。
          transform 只在真的在動的時候才給（style 裡 undefined），因為有 transform
          的元素會變成底下所有 fixed 後代的定位基準——靜止時保持沒有，放大的圖
          在 /demo 的行為就跟以前一模一樣。 */}
      {/* 滑動的舞台。外層是不動的視窗（把上下兩張預覽卡片裁在畫面外），內層才是
          跟著手指走的那一層——一個 transform 同時帶著現在這一頁與兩張卡片，
          卡片就不必自己算位置。
          GameShell 那層本來就是 flex ＋ 垂直置中，內層要把同一組版面規則照抄一次——
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
          // 這一層的底色是最後一道保險。翻頁時整頁滑走一個高度，正常情況下底下那張
          // 預覽剛好補位、不會露出任何縫；但只要有一格沒補上（預覽那一列剛好找不到、
          // 或動畫被打斷），透出來的就是 GameShell 的 game.bg——淺色模式下那是 #eee，
          // 也就是 Dong 看到的那一下白閃。鋪成故事畫面的底色，最壞情況也只是深底。
          bgcolor: 'dialogue.surface',
        }}
      >
        <Box
          style={swipe.style}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {renderContent()}
          {peekContent && (
            <Box
              // inert：預覽的那一頁裡有真的輸入框與按鈕。整棵子樹不可聚焦也不可互動，
              // 所以 Tab 不會走進去、按鈕按不到，未來哪個元件又加了 autoFocus 也搶不走
              // 玩家的游標——比逐一給元件加 preview 參數乾淨。
              // React 18 不認 inert 這個 prop（19 才支援布林），所以用空字串繞過
              // 型別檢查——瀏覽器看到屬性存在就生效。
              {...{ inert: '' }}
              sx={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                ...(peekContent.dir === 'up'
                  ? { top: '100%' }
                  : { bottom: '100%' }),
              }}
            >
              {peekContent.kind === 'page' ? (
                <PeekPage row={peekContent.row} mode={peekContent.mode} />
              ) : (
                <PeekPanel
                  dir={peekContent.dir}
                  label={peekContent.label}
                  detail={peekContent.detail}
                  blocked
                />
              )}
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
