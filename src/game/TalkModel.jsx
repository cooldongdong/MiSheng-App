import { useState, useEffect, useContext, useRef } from 'react';
import { Typography } from '@mui/material';
import PropTypes from 'prop-types'; // 引入 PropTypes
import { useTypewriterEffect } from '../animation/useTypewriterEffect';
import ThemeColorLayer from '../component/layer/ThemeColorLayer';
import Layer from '../component/layer/Layer';
import GradientLayer from '../component/layer/GradientLayer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import CharacterLayer from '../component/layer/CharacterLayer';
import TalkBox from '../component/feature/TalkBox';
import { GameContext } from '../store/game-context';

const Talk = ({ currentRow, onNext, canProceed }) => {
  const [speaker, setSpeaker] = useState(null);
  const [backgroundImg, setBackgroundImg] = useState(null);
  const {
    getImg,
    characterData,
    getMissionById,
    rundownData,
    currentMissionId,
    customPairs,
  } = useContext(GameContext);
  const currentMission = getMissionById(currentMissionId);
  const textContainerRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showFullTextIcon, setShowFullTextIcon] = useState(false);

  useEffect(() => {
    if (rundownData.length < 0) {
      return;
    }

    setShowFullTextIcon(currentRow.text?.length > 130);

    // 如果有 speaker，從 characterData 中找到對應的角色
    if (currentRow?.speaker) {
      const character = characterData.find(
        (char) => char.name === currentRow.speaker
      );
      setSpeaker(character || null); // 儲存角色資訊
    } else {
      setSpeaker(null); // 沒有 speaker 時清空
    }
  }, [currentRow]);

  useEffect(() => {
    setBackgroundImg(
      currentRow?.backgroundImg || currentMission?.backgroundImg
    );
  }, [currentRow, currentMission]);

  const processedText = (currentRow?.text || '').replace(
    /\{\{(.*?)\}\}/g,
    (match, key) => {
      return customPairs[key] ?? match; // 如果 customPairs[key] 存在，則替換，否則保持原樣
    }
  );

  const displayText = useTypewriterEffect(
    processedText || '', // Pass the dialogue text to the hook
    50 // Typing speed in milliseconds
  );

  // 監聽滾動行為
  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 5;

      if (!isAtBottom) {
        setIsUserScrolling(true); // 只有當使用者沒滾到底時，才視為手動滾動
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 當文字更新時，自動滾動到底部（如果使用者沒有手動滾動）
  useEffect(() => {
    const container = textContainerRef.current;
    if (!container || isUserScrolling) return; // 如果使用者正在手動滾動，就不執行

    container.scrollTop = container.scrollHeight;
  }, [displayText]);

  if (!currentRow) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <ThemeColorLayer>
      {/* Talk model */}

      {/* Background-image */}
      {backgroundImg && (
        <Layer>
          <BackgroundLayer src={getImg(backgroundImg)} />
        </Layer>
      )}

      {/* Character */}
      {speaker?.straight && (
        <Layer>
          <CharacterLayer src={getImg(speaker.straight)} />
        </Layer>
      )}

      {/* Gradient after text */}
      <GradientLayer />

      {/* Talk */}
      <Layer>
        <TalkBox
          title={currentRow?.title || currentRow.speaker}
          text={displayText}
          fullText={currentRow?.text}
          textContainerRef={textContainerRef}
          onNext={onNext}
          canProceed={canProceed}
          showIcon={showFullTextIcon}
        />
      </Layer>
    </ThemeColorLayer>
  );
};

// 定義 propTypes
Talk.propTypes = {
  currentRow: PropTypes.object.isRequired,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default Talk;
