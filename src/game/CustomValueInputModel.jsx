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
import ConfirmDialog from '../component/common/ConfirmDialog';
import AuthoringShortcuts from '../component/common/AuthoringShortcuts';
import MissionFeedbackDialog from '../component/common/MissionFeedbackDialog';
import SpeakerText from '../component/common/SpeakerText';
import TalkText from '../component/common/TalkText';
import PropTypes from 'prop-types';

const CustomValueInputModel = ({ currentRow, onNext, canProceed, devTools = false }) => {
  const {
    getImg,
    currentMissionId,
    characterData,
    getMissionById,
    rundownData,
    customPairs,
    updateCustomPairs,
  } = useContext(GameContext);
  const [speaker, setSpeaker] = useState(null);
  const [backgroundImg, setBackgroundImg] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const answerRef = useRef(null);

  // 同 MissionAnswerInput：填完把游標還回輸入框，接著就能 Enter 送出
  const fillTestValue = () => {
    setUserAnswer('測試');
    answerRef.current?.focus();
  };
  const [isSubmit, setIsSubmit] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const currentMission = getMissionById(currentMissionId);

  // 設定角色
  useEffect(() => {
    if (rundownData.length < 0) {
      return;
    }

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

  // 設定背景圖片
  useEffect(() => {
    setBackgroundImg(
      currentRow?.backgroundImg || currentMission?.backgroundImg
    );
  }, [currentRow, currentMission]);

  // 設定答案
  useEffect(() => {
    if (!customPairs[currentRow.customKey]) {
      return;
    }
    setUserAnswer(customPairs[currentRow.customKey]);
    console.log(customPairs[currentRow.customKey]);
  }, [currentRow, customPairs]);

  const handleAnswerSubmit = () => {
    if (userAnswer.trim() === '') {
      setFeedback('答案不能留空喔！');
      setOpenDialog(true);
    } else {
      setOpenConfirmDialog(true);
    }
  };

  const confirmSubmit = () => {
    if (!currentRow?.customKey) {
      return;
    }
    if (!userAnswer) {
      return;
    }
    updateCustomPairs(currentRow.customKey, userAnswer);
    setIsSubmit(true);
    setOpenConfirmDialog(false);
    setUserAnswer('');
    onNext();
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

      {/* AnswerInput */}
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
                // 這一頁沒有「正確答案」，填的是測試值——重點是讓 {{變數}} 有東西，
                // 後面引用到它的對白才驗得出來。略過就沒有這個效果。
                <AuthoringShortcuts
                  onFill={fillTestValue}
                  fillLabel="填入測試值"
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

          {/* confirm 彈出視窗 */}
          <ConfirmDialog
            open={openConfirmDialog}
            onClose={() => setOpenConfirmDialog(false)}
            onConfirm={() => confirmSubmit()}
            title={'確定送出？'}
            confirmText={`確定要送出資料了嗎？`}
          />
        </BottomBox>
      </Layer>
    </ThemeColorLayer>
  );
};

// 定義 propTypes
CustomValueInputModel.propTypes = {
  currentRow: PropTypes.object.isRequired,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
  devTools: PropTypes.bool,
};

export default CustomValueInputModel;
