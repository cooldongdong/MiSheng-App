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

const GameController = ({
  characterCsvFile,
  hintCsvFile,
  missionCsvFile,
  propCsvFile,
  rundownCsvFile,
  storyCsvFile,
  configCsvFile,
  dataVersion = 0,
  allowBack = false,
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
    model: currentRow?.model,
    onNext: handleNext,
    canProceed: canProceedToNext(),
    goBack: handleBack,
    canGoBack,
    allowBack,
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

  // Render content based on the model type
  const renderContent = () => {
    const ModelComponent = modelComponents[currentRow.model];
    return ModelComponent ? (
      <ModelComponent
        currentRow={currentRow}
        onNext={handleNext}
        canProceed={canProceedToNext()}
      />
    ) : (
      <Typography>Unknown model type: {currentRow.model}</Typography>
    );
  };

  return (
    <>
      <ModelTestInfo
        model={currentRow.model}
        hint={
          allowBack
            ? wentBack
              ? '已回退 · 變數與關卡進度不會跟著倒回'
              : '← → 翻頁'
            : null
        }
      />
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
  allowBack: PropTypes.bool,
};

export default GameController;
