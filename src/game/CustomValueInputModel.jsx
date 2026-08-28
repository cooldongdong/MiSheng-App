import { useContext, useState, useEffect, useRef } from 'react';
import { GameContext } from '../store/game-context';
import { Stack } from '@mui/material';
import ThemeColorLayer from '../component/layer/ThemeColorLayer';
import Layer from '../component/layer/Layer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import CharacterLayer from '../component/layer/CharacterLayer';
import GradientLayer from '../component/layer/GradientLayer';
import BottomBox from '../component/common/BottomBox';
import NextButton from '../component/common/NextButton';
import AnswerInputForm from '../component/common/AnswerInputForm';
import AuthoringShortcuts from '../component/common/AuthoringShortcuts';
import useAnswerShortcuts from '../hook/useAnswerShortcuts';
import MissionFeedbackDialog from '../component/common/MissionFeedbackDialog';
import SpeakerText from '../component/common/SpeakerText';
import TalkText from '../component/common/TalkText';
import PropTypes from 'prop-types';

const CustomValueInputModel = ({
  currentRow,
  onNext,
  canProceed,
  devTools = false,
  hideContent = false,
}) => {
  const {
    getImg,
    currentMissionId,
    characterData,
    getMissionById,
    customPairs,
    updateCustomPairs,
  } = useContext(GameContext);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const answerRef = useRef(null);

  // 填入測試值，**不送出**——跟作答頁的「自動作答」同一個意思，兩顆按鈕的行為要一致。
  // 這一頁沒有「正確答案」，填的是測試值：重點是讓 {{變數}} 有東西，後面引用到它的
  // 對白才驗得出來；略過就沒有這個效果。
  // **只填，不 focus**——理由見 MissionAnswerInputModel 的 autoAnswer：手機上一 focus
  // 鍵盤就跳出來。
  const autoFillValue = () => setUserAnswer('測試');
  const [isSubmit, setIsSubmit] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const currentMission = getMissionById(currentMissionId);

  // 講者與底圖都是從 currentRow 推導出來的，**推導值就用推導的**。
  //
  // 原本是 useState ＋ useEffect 回填，於是每次換頁都會有一個 render 是
  // 「新的一頁、舊的（或空的）底圖」——那一格就是換頁時閃的東西
  // （Dong 2026-08-28）。與 GameController 把 currentRow 從 state 改成 useMemo
  // 同一個病：存起來的推導值永遠慢真相一個 render。
  const speaker = currentRow?.speaker
    ? characterData?.find((char) => char.name === currentRow.speaker) || null
    : null;
  const backgroundImg = currentRow?.backgroundImg || currentMission?.backgroundImg;

  // 設定答案
  useEffect(() => {
    if (!customPairs[currentRow.customKey]) {
      return;
    }
    setUserAnswer(customPairs[currentRow.customKey]);
    console.log(customPairs[currentRow.customKey]);
  }, [currentRow, customPairs]);

  useAnswerShortcuts({
    enabled: devTools && !isSubmit,
    onFill: autoFillValue,
    onSkip: canProceed ? onNext : null,
  });

  // 送出不再先問「確定送出？」（Dong 2026-08-28）。這一頁收的是暱稱那類自訂變數，
  // 沒有對錯，填錯了也只是後面對白裡的稱呼怪怪的——而且現在往下滑就回得去改。
  // 為了一個沒有代價的動作擋一次確認，是拿使用者的兩下換我們的零風險。
  // （「我放棄了」那個確認留著：它會把關卡標成放棄，那才是真的回不去。）
  const submit = (value) => {
    if (!currentRow?.customKey || !value) {
      return;
    }
    updateCustomPairs(currentRow.customKey, value);
    setIsSubmit(true);
    setUserAnswer('');
    onNext();
  };

  const handleAnswerSubmit = () => {
    if (userAnswer.trim() === '') {
      setFeedback('答案不能留空喔！');
      setOpenDialog(true);
      return;
    }
    submit(userAnswer);
  };

  return (
    <ThemeColorLayer>
      {/* CostomValueInput model */}

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

      {/* AnswerInput。hideContent 見 TalkModel 檔頭 */}
      {!hideContent && (
        <Layer>
        <BottomBox>
          <Stack spacing={2}>
            <SpeakerText speaker={currentRow?.title || currentRow.speaker} />
            <TalkText text={currentRow?.text} />
          </Stack>
          {!isSubmit ? (
            <>
              <AnswerInputForm
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onClick={handleAnswerSubmit}
                disabled={isSubmit}
                inputRef={answerRef}
              />
              {devTools && (
                <AuthoringShortcuts
                  onFill={autoFillValue}
                  fillLabel="自動填值"
                  onSkip={canProceed ? onNext : null}
                />
              )}
            </>
          ) : (
            canProceed && <NextButton onClick={onNext}>Next</NextButton>
          )}

          {/* feedback 彈出視窗 */}
          <MissionFeedbackDialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            isAnswerCorrect={isSubmit}
            feedback={feedback}
          />

        </BottomBox>
      </Layer>
      )}
    </ThemeColorLayer>
  );
};

// 定義 propTypes
CustomValueInputModel.propTypes = {
  currentRow: PropTypes.object.isRequired,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
  devTools: PropTypes.bool,
  hideContent: PropTypes.bool,
};

export default CustomValueInputModel;
