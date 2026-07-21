import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import ContentList from '../common/ContentList';
import HintAccordion from '../common/HintAccordion';
import ConfirmDialog from '../common/ConfirmDialog';

const HintPage = () => {
  const {
    characterData,
    hintData,
    getMissionById,
    currentMissionId,
    unlockedHints,
    unlockHint,
  } = useContext(GameContext);
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
