import { useState, useEffect, useContext } from 'react';
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

const QuizModel = ({ currentRow }) => {
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
  const [speaker, setSpeaker] = useState(null);
  const [backgroundImg, setBackgroundImg] = useState(null);
  const [options, setOptions] = useState([]);
  const currentMission = getMissionById(currentMissionId);

  useEffect(() => {
    // Find options related to the current question
    const relatedOptions = rundownData.filter(
      (row) => row.parentId === currentId
    );
    setOptions(relatedOptions);

    // 如果有 speaker，從 characterData 中找到對應的角色
    if (currentRow?.speaker) {
      const character = characterData.find(
        (char) => char.name === currentRow.speaker
      );
      setSpeaker(character || null); // 儲存角色資訊
    } else {
      setSpeaker(null); // 沒有 speaker 時清空
    }
  }, [currentId, currentRow]);

  useEffect(() => {
    setBackgroundImg(
      currentRow?.backgroundImg || currentMission?.backgroundImg
    );
  }, [currentRow, currentMission]);

  const processedText = (currentRow?.text || '').replace(
    /\{\{(.*?)\}\}/g,
    (match, key) => {
      return customPairs[key] ?? match; // 如果 customPair[key] 存在，則替換，否則保持原樣
    }
  );

  const displayText = useTypewriterEffect(
    processedText || '', // Pass the dialogue text to the hook
    50 // Typing speed in milliseconds
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

      {/* Quiz */}
      <Layer>
        <QuestionBox
          speaker={currentRow?.speaker || currentRow.title}
          text={displayText}
          options={options}
          onOptionClick={handleOptionClick}
        />
      </Layer>
    </ThemeColorLayer>
  );
};

// 定義 propTypes
QuizModel.propTypes = {
  currentRow: PropTypes.object,
};

export default QuizModel;
