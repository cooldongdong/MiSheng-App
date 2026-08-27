import { useContext, useState, useEffect, useRef } from 'react';
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
import AuthoringShortcuts from '../component/common/AuthoringShortcuts';
import useAnswerShortcuts from '../hook/useAnswerShortcuts';
import MissionFeedbackDialog from '../component/common/MissionFeedbackDialog';
import PropTypes from 'prop-types';

const MissionAnswerInputModel = ({ onNext, canProceed, devTools = false }) => {
  const {
    getImg,
    currentMissionId,
    getMissionById,
    playerMissionData,
    updateMissionStatus,
  } = useContext(GameContext);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const answerRef = useRef(null);
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

  // 吃參數而不是直接讀 userAnswer state：「自動作答」要在同一個 tick 裡填好又送出，
  // 而 setUserAnswer 要等下一次 render 才生效，讀 state 會拿到上一輪的空字串。
  const submitAnswer = (value) => {
    const isCorrect = answerArray.some(
      (answer) => normalize(answer) === normalize(value)
    );

    const similarKey = Object.keys(similarAnswers).find(
      (simiAnswer) => normalize(simiAnswer) === normalize(value)
    );

    if (isCorrect) {
      updateMissionStatus(currentMission.id, 'complete');
      setFeedback(currentMission.successText);
      setIsAnswerCorrect(true);
      setOpenDialog(true); // 打開彈出視窗
    } else if (similarKey) {
      setFeedback(similarAnswers[similarKey]);
      setOpenDialog(true);
    } else if (value.trim() === '我放棄了') {
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

  const handleAnswerSubmit = () => submitAnswer(userAnswer);

  // 滑鼠點按鈕與按 ⌘Enter 走的是同一個函式——按鈕上標著那個鍵位，
  // 兩者行為不一樣的話那個標示就是在說謊。
  const autoAnswer = () => submitAnswer(answerArray[0]);

  useAnswerShortcuts({
    enabled: devTools && !isAnswerCorrect,
    onFill: answerArray[0] ? autoAnswer : null,
    onSkip: canProceed ? onNext : null,
  });

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
            <>
              <AnswerInputForm
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onClick={handleAnswerSubmit}
                disabled={isAnswerCorrect}
                giveupCountdown={giveupCountdown}
                inputRef={answerRef}
              />
              {devTools && (
                <AuthoringShortcuts
                  onFill={answerArray[0] ? autoAnswer : null}
                  fillLabel="自動作答"
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
            confirmOnEnter
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
  devTools: PropTypes.bool,
};

export default MissionAnswerInputModel;
