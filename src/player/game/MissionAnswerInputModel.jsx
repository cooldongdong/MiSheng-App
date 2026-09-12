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

const MissionAnswerInputModel = ({
  currentRow,
  onNext,
  canProceed,
  devTools = false,
  hideContent = false,
}) => {
  const {
    getImg,
    currentMissionId,
    getMissionById,
    playerMissionData,
    updateMissionStatus,
    record,
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
  const [answerArray, setAnswerArray] = useState([]);
  const [similarAnswers, setSimilarAnswers] = useState([]);

  // **推導值就用推導的，不要存成 state。**
  //
  // 原本是 `useState(null)` ＋ effect 回填，而 effect 是**畫完之後**才跑——
  // 於是這個元件每次掛載，第一幀的 currentMission 必定是 null，畫面上就閃一下
  // 「未選擇任務。」（Dong 2026-09-12 回報「還是會有一瞬間跳出」）。
  // 這是 TalkModel 的講者／底圖、GameController 的 currentRow 修過的同一個病：
  // **存起來的推導值永遠慢真相一個 render。**
  //
  // **先看這一列自己的 missionId，再退回 context。** 那一格在第一幀就在手上
  // （validator 保證 MissionAnswerInput 一定指到一個真關卡），而 context 的
  // currentMissionId 要等 provider 的同步 effect 才會跟上這一列。
  const currentMission =
    getMissionById(currentRow?.missionId) ?? getMissionById(currentMissionId);

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

    // 玩家打了什麼，是這批資料裡最有價值的一項——`similarAnswer` 那一欄現在靠猜
    // 和試玩填，有真資料它就變成填空題。「我放棄了」是指令不是答案，不記成答錯。
    if (isCorrect) {
      record('answer_right', { missionId: currentMission.id, value });
      updateMissionStatus(currentMission.id, 'complete');
      setFeedback(currentMission.successText);
      setIsAnswerCorrect(true);
      setOpenDialog(true); // 打開彈出視窗
    } else if (similarKey) {
      // 命中 similarAnswer 仍然是答錯，只是有客製回饋——分不分開留給分析時決定
      record('answer_wrong', { missionId: currentMission.id, value });
      setFeedback(similarAnswers[similarKey]);
      setOpenDialog(true);
    } else if (value.trim() === '我放棄了') {
      currentMission.confirmGiveUpText &&
        setConfirmGiveUpText(currentMission.confirmGiveUpText);
      setOpenConfirmDialog(true); // 顯示確認放棄的對話框
    } else {
      record('answer_wrong', { missionId: currentMission.id, value });
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
  //
  // **只填進去，不送出**（Dong 2026-08-28 回報）。原本直接呼叫 submitAnswer，於是
  // 按一下就整關過了——你看不到答案長什麼樣，也**跳過了送出這條路本身**，而送出
  // 正是作答頁最需要被驗的地方。想要「不作答直接往下」已經有旁邊那顆「略過」了，
  // 兩顆按鈕各做一件事才分得清楚。
  // **只填，連游標都不放進去。** 一度加了 focus()，讓桌機可以填完直接按 Enter——
  // 但那在手機上就是把鍵盤整個叫出來，跟剛拿掉的 autoFocus 是同一件事
  // （Dong 2026-08-28）。送出鈕就在旁邊，為了省桌機一次點擊而嚇到手機使用者不划算。
  const autoAnswer = () => setUserAnswer(answerArray[0]);

  useAnswerShortcuts({
    enabled: devTools && !isAnswerCorrect,
    onFill: answerArray[0] ? autoAnswer : null,
    onSkip: canProceed ? onNext : null,
  });

  const confirmGiveUp = () => {
    record('give_up', { missionId: currentMission.id });
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

      {/* AnswerInput。hideContent 見 TalkModel 檔頭 */}
      {!hideContent && (
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
      )}
    </ThemeColorLayer>
  );
};

// 定義 propTypes
MissionAnswerInputModel.propTypes = {
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
  devTools: PropTypes.bool,
  currentRow: PropTypes.object,
  hideContent: PropTypes.bool,
};

export default MissionAnswerInputModel;
