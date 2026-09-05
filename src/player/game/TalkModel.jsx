import { useContext } from 'react';
import PropTypes from 'prop-types'; // 引入 PropTypes
import ThemeColorLayer from '../component/layer/ThemeColorLayer';
import Layer from '../component/layer/Layer';
import GradientLayer from '../component/layer/GradientLayer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import CharacterLayer from '../component/layer/CharacterLayer';
import TalkBox from '../component/feature/TalkBox';
import { GameContext } from '../store/game-context';

// hideContent：把這一頁的**內容**藏起來，底圖、立繪、漸層照留（上下滑翻頁）。
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

  // GameController 已經擋過 currentRow，正常路徑到不了這裡。
  // 真的到了就什麼都不畫——閃一行英文字比空白更像壞掉。
  if (!currentRow) return null;

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
            text={processedText}
            fullText={currentRow?.text}
            typeMode={textMode}
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
