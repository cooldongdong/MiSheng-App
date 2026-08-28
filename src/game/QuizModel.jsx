import { useContext } from 'react';
import { Typography } from '@mui/material';
import PropTypes from 'prop-types'; // 引入 PropTypes
import { GameContext } from '../store/game-context';
import { useTypewriterEffect } from '../animation/useTypewriterEffect';
import ThemeColorLayer from '../component/layer/ThemeColorLayer';
import Layer from '../component/layer/Layer';
import GradientLayer from '../component/layer/GradientLayer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import CharacterLayer from '../component/layer/CharacterLayer';
import QuestionBox from '../component/feature/QuestionBox';

const QuizModel = ({
  currentRow,
  devTools = false,
  textMode = 'type',
  hideContent = false,
}) => {
  const {
    getImg,
    characterData,
    getMissionById,
    rundownData,
    currentMissionId,
    currentId,
    goToId,
    customPairs,
  } = useContext(GameContext);
  const currentMission = getMissionById(currentMissionId);

  // 講者、底圖、「要不要給全文鈕」三個都是從 currentRow 推導出來的，**推導值就用推導的**。
  //
  // 原本它們是 useState ＋ useEffect 回填，於是每次換頁都會有一個 render 是
  // 「新的一頁、舊的（或空的）底圖」——按 NEXT 時就會閃一下，上下滑翻頁因為交接點
  // 更明顯而被 Dong 抓到（2026-08-28）。這與 GameController 當初把 currentRow 從
  // state 改成 useMemo 是同一個病：**存起來的推導值永遠慢真相一個 render。**
  const options = Array.isArray(rundownData)
    ? rundownData.filter((row) => row.parentId === currentId)
    : [];
  const speaker = currentRow?.speaker
    ? characterData?.find((char) => char.name === currentRow.speaker) || null
    : null;
  const backgroundImg = currentRow?.backgroundImg || currentMission?.backgroundImg;

  const processedText = (currentRow?.text || '').replace(
    /\{\{(.*?)\}\}/g,
    (match, key) => {
      return customPairs[key] ?? match; // 如果 customPair[key] 存在，則替換，否則保持原樣
    }
  );

  const displayText = useTypewriterEffect(
    processedText || '', // Pass the dialogue text to the hook
    50, // Typing speed in milliseconds
    textMode // 見 useTypewriterEffect：往回走給全文、正在滑過來的先不給字
  );

  const handleOptionClick = (nextId) => {
    if (!nextId) {
      return;
    }
    goToId(nextId);
  };

  if (!currentRow) {
    return <Typography>Quiz Loading...</Typography>;
  }

  return (
    <ThemeColorLayer>
      {/* Quiz model */}

      {/* Background-image */}
      {backgroundImg && (
        <Layer>
          <BackgroundLayer src={getImg(backgroundImg)} />
        </Layer>
      )}

      {/* Character */}
      {speaker?.straight && (
        <Layer>
          <CharacterLayer src={getImg(speaker?.straight)} />
        </Layer>
      )}

      {/* Gradient after text */}
      <GradientLayer />

      {/* Quiz。hideContent 見 TalkModel 檔頭——選項本身就是謎面的一部分，
          往前拉的預覽不能露 */}
      {!hideContent && (
        <Layer>
          <QuestionBox
            speaker={currentRow?.speaker || currentRow.title}
            text={displayText}
            options={options}
            onOptionClick={handleOptionClick}
            showKeys={devTools}
          />
        </Layer>
      )}
    </ThemeColorLayer>
  );
};

// 定義 propTypes
QuizModel.propTypes = {
  currentRow: PropTypes.object,
  devTools: PropTypes.bool,
  textMode: PropTypes.oneOf(['type', 'instant', 'silent']),
  hideContent: PropTypes.bool,
};

export default QuizModel;
