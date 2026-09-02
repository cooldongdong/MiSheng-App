import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import ContentList from '../common/ContentList';
import HintAccordion from '../common/HintAccordion';
import ConfirmDialog from '../common/ConfirmDialog';
import useHintTick from '../../hook/useHintTick';
import {
  dueHintIndexes,
  hintRemainingMs,
  hintRemainingMinutes,
} from '../../game/hintTimer';

const HintPage = () => {
  const {
    characterData,
    hintData,
    getMissionById,
    currentMissionId,
    unlockedHints,
    unlockHint,
    missionStartedAt,
  } = useContext(GameContext);
  const now = useHintTick();
  const [currentHints, setCurrentHints] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false); // Dialog 的開關
  const [currentHintIndex, setCurrentHintIndex] = useState(null); // 當前選擇的提示索引
  const [expandedHints, setExpandedHints] = useState([]);

  const currentMission = getMissionById(currentMissionId);

  useEffect(() => {
    if (!currentMission) {
      // console.log('還沒有 currentMission！');
      return;
    }
    if (!Array.isArray(hintData)) {
      // console.log('hintData 不是有效的數組！');
      return;
    }
    const filteredHints = hintData.filter(
      (row) => row.missionId === currentMission.id
    );
    const updatedFilteredHints = filteredHints.map((hint) => {
      const speaker = characterData.find((char) => char.name === hint.speaker);
      return { ...hint, avatar: speaker?.avatar || '' };
    });

    setCurrentHints(updatedFilteredHints);
  }, [currentMissionId, hintData, currentMission]);

  // 換關就把展開狀態清掉。
  //
  // expandedHints 裝的是索引（[0, 2]），而索引只在「這一關的提示清單」裡有意義——
  // 上一關的第 0 則跟這一關的第 0 則是兩則不同的提示。
  //
  // 一般玩遊戲時撞不到，是因為要換關就得先離開提示分頁，而分頁切換會把這個元件
  // 卸載、state 跟著歸零。但 **/create 的三欄畫面可以在不離開提示分頁的情況下換關**
  // ——點右邊流程圖的方塊會 goToId 跳到別關，而中間欄的分頁索引（GameShell 的 value）
  // 不會被碰。於是這個元件一直掛著，上一關的展開狀態就套到了新的一關上
  // （Dong 2026-09-01 回報：在某一關解鎖提示後跳到沒解鎖的那關，那關的提示也是開的）。
  useEffect(() => {
    setExpandedHints([]);
  }, [currentMissionId]);

  // 時間到的提示自動解鎖。
  //
  // 放在提示頁而不是全域，是因為**玩家沒在看的時候解不解鎖沒有差別**——他打開
  // 這一頁的那一刻，過期的會一起出現。導覽列的小紅點用同一組判斷（dueHintIndexes）
  // 自己算，所以「有東西該看了」在別的分頁上也看得到。
  const startedAt = missionStartedAt?.[currentMission?.id];
  useEffect(() => {
    if (!currentMission) return;
    const due = dueHintIndexes(
      currentHints,
      startedAt,
      unlockedHints[currentMission.id],
      now
    );
    due.forEach((index) => unlockHint(currentMission.id, index));
  }, [now, currentHints, startedAt, unlockedHints, currentMission]);

  const handleExpand = (index) => {
    setExpandedHints((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleUnlockClick = (index) => {
    setCurrentHintIndex(index);
    setDialogOpen(true);
  };

  const handleConfirmUnlock = () => {
    if (currentHintIndex !== null) {
      unlockHint(currentMission.id, currentHintIndex);
      setTimeout(() => {
        handleExpand(currentHintIndex);
      }, 100); // 略微延遲確保狀態更新,確保在解鎖後才展開
    }
    setDialogOpen(false);
    setCurrentHintIndex(null);
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setCurrentHintIndex(null);
  };

  return (
    <PageContainer>
      <PageTitleText title="提示" />
      <ContentList
        items={currentHints}
        renderItem={(hint, index) => (
          <HintAccordion
            key={index}
            index={index}
            hint={hint}
            isUnlocked={!!unlockedHints[currentMission?.id]?.[index]}
            isExpanded={expandedHints.includes(index)}
            onExpand={handleExpand}
            onUnlock={handleUnlockClick}
            remainingMinutes={
              hintRemainingMinutes(hintRemainingMs(hint, startedAt, now)) ??
              undefined
            }
          />
        )}
        emptyText="No hints available"
      />

      {/* 解鎖確認 Dialog */}
      <ConfirmDialog
        open={dialogOpen}
        onClose={handleCancel}
        onConfirm={handleConfirmUnlock}
        title={'確認解鎖'}
        confirmText={`確定要解鎖提示 ${currentHintIndex + 1} 嗎？`}
      />
    </PageContainer>
  );
};

export default HintPage;
