import { useContext, useState, useEffect } from 'react';
import { GameContext } from '../store/game-context';
import { Typography } from '@mui/material';
import ThemeColorLayer from '../component/layer/ThemeColorLayer';
import Layer from '../component/layer/Layer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import MissionSubtitleText from '../component/common/MissionSubtitleText';
import MissionTitleText from '../component/common/MissionTitleText';
import BottomBox from '../component/common/BottomBox';
import NextButton from '../component/common/NextButton';
import AnswerInputForm from '../component/common/AnswerInputForm';
import ConfirmDialog from '../component/common/ConfirmDialog';
import MissionFeedbackDialog from '../component/common/MissionFeedbackDialog';
import PropTypes from 'prop-types';

const MissionAnswerInputModel = ({ onNext, canProceed }) => {
  const {
    getImg,
    currentMissionId,
    getMissionById,
    playerMissionData,
    updateMissionStatus,
  } = useContext(GameContext);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [confirmGiveUpText, setConfirmGiveUpText] = useState('確定要放棄嗎？');
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false); // 用於控制按鈕顯示
  const [isGiveUp, setIsGiveUp] = useState(false);
  const [openDialog, setOpenDialog] = useState(false); // 控制彈出視窗
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false); // 控制確定放棄視窗
  const [giveupCountdown, setGiveupCountdown] = useState(5);
  const [currentMission, setCurrentMission] = useState(null);
  const [answerArray, setAnswerArray] = useState([]);
  const [similarAnswers, setSimilarAnswers] = useState([]);

  useEffect(() => {
    const mission = getMissionById(currentMissionId);
    if (mission) setCurrentMission(mission);
  }, [currentMissionId, getMissionById]);

  useEffect(() => {
    if (currentMission) {
      const answerArray = currentMission.answer.split(/\r?\n/);
      setAnswerArray(answerArray);

      const similarAnswers = Object.fromEntries(
        (currentMission.similarAnswer || '')
          .split(/\n/)
          .map((line) => {
            const parts = line.split('>>>');
            return parts.length === 2
              ? [parts[0].trim(), parts[1].trim()]
              : null;
          })
          .filter(Boolean)
      );
      setSimilarAnswers(similarAnswers);
    }
  }, [currentMission]);

  useEffect(() => {
    const currentPlayerMission = playerMissionData.find(
      (data) => data.id === String(currentMissionId)
    );
    const status = currentPlayerMission?.status;
    if (status === 'complete') {
      setIsAnswerCorrect(true);
    } else {
      setIsAnswerCorrect(false);
    }
  }, [currentMission, currentMissionId, playerMissionData]);

  function toHalfWidth(str) {
    return str.replace(/[\uFF01-\uFF5E]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
  }

  // 比對答案前的標準化函式： 全形轉半形 & 去除空白 & 大寫變小寫
  const normalize = (str) => toHalfWidth(str).replace(/\s+/g, '').toLowerCase();

  const handleAnswerSubmit = () => {
    const isCorrect = answerArray.some(
      (answer) => normalize(answer) === normalize(userAnswer)
    );

    const similarKey = Object.keys(similarAnswers).find(
      (simiAnswer) => normalize(simiAnswer) === normalize(userAnswer)
    );

    if (isCorrect) {
      updateMissionStatus(currentMission.id, 'complete');
      setFeedback(currentMission.successText);
      setIsAnswerCorrect(true);
      setOpenDialog(true); // 打開彈出視窗
    } else if (similarKey) {
      setFeedback(similarAnswers[similarKey]);
      setOpenDialog(true);
    } else if (userAnswer.trim() === '我放棄了') {
      currentMission.confirmGiveUpText &&
        setConfirmGiveUpText(currentMission.confirmGiveUpText);
      setOpenConfirmDialog(true); // 顯示確認放棄的對話框
    } else {
      setFeedback('答案錯誤，請再試一次。');
      setIsAnswerCorrect(false);
      if (giveupCountdown > 0) {
        setGiveupCountdown(giveupCountdown - 1);
      }
      setOpenDialog(true); // 打開彈出視窗
    }
    setUserAnswer(''); // 清空輸入框內容
  };

  const confirmGiveUp = () => {
    updateMissionStatus(currentMission.id, 'complete');
    setFeedback(currentMission.giveUpText);
    setIsGiveUp(true);
    setIsAnswerCorrect(true);
    setUserAnswer('');
    setOpenDialog(true);
    setOpenConfirmDialog(false);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setOpenConfirmDialog(false);
  };

  if (!currentMission) {
    return <Typography>未選擇任務。</Typography>;
  }

  return (
    <ThemeColorLayer>
      {/* AnswerInput model */}

      {/* Background-image */}
      {currentMission?.backgroundImg && (
        <Layer>
          <BackgroundLayer
            src={getImg(currentMission.backgroundImg)}
            opacity="0.9"
          />
        </Layer>
      )}

      {/* AnswerInput */}
      <Layer>
        <BottomBox>
          <MissionSubtitleText subtitle={currentMission.subtitle} />
          <MissionTitleText title={currentMission.title} />
          {!isAnswerCorrect ? (
            <AnswerInputForm
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onClick={handleAnswerSubmit}
              disabled={isAnswerCorrect}
              giveupCountdown={giveupCountdown}
            />
          ) : (
            canProceed && <NextButton onClick={onNext}>Next</NextButton>
          )}

          {/* feedback 彈出視窗 */}
          <MissionFeedbackDialog
            open={openDialog}
            onClose={handleCloseDialog}
            isAnswerCorrect={isAnswerCorrect}
            isGiveUp={isGiveUp}
            feedback={feedback}
          />

          {/* confirmGiveUp 彈出視窗 */}
          <ConfirmDialog
            open={openConfirmDialog}
            onClose={handleCloseDialog}
            onConfirm={confirmGiveUp}
            confirmText={confirmGiveUpText}
          />
        </BottomBox>
      </Layer>
    </ThemeColorLayer>
  );
};

// 定義 propTypes
MissionAnswerInputModel.propTypes = {
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default MissionAnswerInputModel;
