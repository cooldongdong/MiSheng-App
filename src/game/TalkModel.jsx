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

// hideContent：把這一頁的**內容**藏起來，底圖、立繪、漸層照留（COO-135）。
// 給上下拉的預覽用——往前拉時只讓人看到「場景換了沒、誰要說話」，不給台詞。
//
// 為什麼是一個 prop 而不是在外面另外拼一棵樹：外面拼的樹跟這一頁**不是同一棵**，
// 放手那一刻換過去就是整棵重新掛載，角色圖被砍掉重生，於是閃一下
// （Dong 2026-08-28 回報：一頁有角色圖、一頁沒有時最明顯）。按 NEXT 不會閃，正是
// 因為那條路上元件實例活著、React 只換 img 的 src。同一棵樹 ＋ 換 prop 才追得上它。

const Talk = ({
  currentRow,
  onNext,
  canProceed,
  textMode = 'type',
  hideContent = false,
}) => {
  const {
    getImg,
    characterData,
    getMissionById,
    currentMissionId,
    customPairs,
  } = useContext(GameContext);
  const currentMission = getMissionById(currentMissionId);
  const textContainerRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // 講者、底圖、「要不要給全文鈕」三個都是從 currentRow 推導出來的，**推導值就用推導的**。
  //
  // 原本它們是 useState ＋ useEffect 回填，於是每次換頁都會有一個 render 是
  // 「新的一頁、舊的（或空的）底圖」——按 NEXT 時就會閃一下，上下滑翻頁因為交接點
  // 更明顯而被 Dong 抓到（2026-08-28）。這與 GameController 當初把 currentRow 從
  // state 改成 useMemo 是同一個病：**存起來的推導值永遠慢真相一個 render。**
  const speaker = currentRow?.speaker
    ? characterData?.find((char) => char.name === currentRow.speaker) || null
    : null;
  const backgroundImg = currentRow?.backgroundImg || currentMission?.backgroundImg;
  const showFullTextIcon = (currentRow?.text?.length || 0) > 130;

  const processedText = (currentRow?.text || '').replace(
    /\{\{(.*?)\}\}/g,
    (match, key) => {
      return customPairs[key] ?? match; // 如果 customPairs[key] 存在，則替換，否則保持原樣
    }
  );

  const displayText = useTypewriterEffect(
    processedText || '', // Pass the dialogue text to the hook
    50, // Typing speed in milliseconds
    textMode // 見 useTypewriterEffect：往回走給全文、正在滑過來的先不給字
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
      {!hideContent && (
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
      )}
    </ThemeColorLayer>
  );
};

// 定義 propTypes
Talk.propTypes = {
  textMode: PropTypes.oneOf(['type', 'instant', 'silent']),
  hideContent: PropTypes.bool,
  currentRow: PropTypes.object.isRequired,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default Talk;
