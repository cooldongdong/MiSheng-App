import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { GameContext } from '../store/game-context';
import { Typography } from '@mui/material';
import ModelTestInfo from '../component/common/ModelTestInfo';
import TalkModel from './TalkModel';
import QuizModel from './QuizModel';
import MissionStartModel from './MissionStartModel';
import MissionAnswerInputModel from './MissionAnswerInputModel';
import CustomValueInputModel from './CustomValueInputModel';
import ImgModel from './ImgModel';
import { loadCSVData } from './csvLoader';
import useNextId from '../hook/useNextId';
import useFlowKeys from '../hook/useFlowKeys';
import PropTypes from 'prop-types'; // 引入 PropTypes

// 「按一下就走」的三種 model
const FORWARD_MODELS = new Set(['Talk', 'Img', 'MissionStart']);
// 游標會自動落在輸入框裡的兩種——那時方向鍵是移動游標，得先按 Esc 才拿得回來
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
    setCurrentMissionId,
    updateMissionStatus,
    playerMissionData,
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

  useFlowKeys({
    canAdvance,
    onNext: handleNext,
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

  const modelComponents = {
    Talk: TalkModel,
    Quiz: QuizModel,
    MissionStart: MissionStartModel,
    MissionAnswerInput: MissionAnswerInputModel,
    Img: ImgModel,
    CustomValueInput: CustomValueInputModel,
  };

  // 鍵盤提示借用 ModelTestInfo 那一列。回退後的但書優先——那一刻要講的是
  // 「狀態沒跟著倒回」，不是還有哪些鍵可以按。
  //
  // 每一頁只講這一頁真的能按的東西——不能前進的頁面寫「↑↓ 翻頁」，等於叫人去按
  // 一個不會有反應的鍵，那正是這整條規則想避免的困惑。
  const keyHint = !devTools
    ? null
    : wentBack
      ? '已回退 · 變數與關卡進度不會跟著倒回'
      : quizOptions.length > 0
        ? '按數字選選項 · ↑ 回上一頁'
        : INPUT_MODELS.has(currentRow?.model) && !canAdvance
          ? 'Esc 離開輸入框 · ↑ 回上一頁'
          : canAdvance
            ? '↑↓ 翻頁'
            : '↑ 回上一頁';

  // Render content based on the model type
  const renderContent = () => {
    const ModelComponent = modelComponents[currentRow.model];
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
      <ModelTestInfo model={currentRow.model} hint={keyHint} />
      {renderContent()}
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
