import { useContext, useState, useEffect } from 'react';
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
import MissionFeedbackDialog from '../component/common/MissionFeedbackDialog';
import SpeakerText from '../component/common/SpeakerText';
import TalkText from '../component/common/TalkText';
import PropTypes from 'prop-types';

const CustomValueInputModel = ({ currentRow, onNext, canProceed }) => {
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
            <AnswerInputForm
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onClick={handleAnswerSubmit}
              disabled={isSubmit}
            />
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
};

export default CustomValueInputModel;
