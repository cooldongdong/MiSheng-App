import { useContext, useEffect, useState, useRef } from 'react';
import { keyOf } from '../../../shared/rowKey';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import MissionList from '../common/MissionList';
import ConfirmDialog from '../common/ConfirmDialog';

const MissionPage = () => {
  const {
    missionData,
    getMissionById,
    playerMissionData,
    rundownData,
    currentMissionId,
    goToId,
    setCurrentMissionId,
    updateMissionStatus,
  } = useContext(GameContext);
  const [displayMissions, setDisplayMissions] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [selectedMissionTitle, setSelectedMissionTitle] = useState(null);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  const currentMission = getMissionById(currentMissionId);

  useEffect(() => {
    if (!currentMission) {
      console.log('還沒有 currentMission！');
      return;
    }
    if (!Array.isArray(missionData)) {
      console.log('missionData 不是有效的數組！');
      return;
    }
    const filterMissions = missionData.filter((row) => row.id > 0);
    const updatedFilterMissions = filterMissions.map((mission) => {
      const targetMission = playerMissionData.find(
        (playerMD) => playerMD.id === mission.id
      );
      return { ...mission, status: targetMission?.status || '' };
    });
    setDisplayMissions(updatedFilterMissions);
  }, [currentMission, currentMissionId, missionData, playerMissionData]);

  const handleMissionSelect = (missionId, title) => {
    setSelectedMissionId(missionId);
    setSelectedMissionTitle(title);
    setDialogOpen(true);
  };

  const handleConfirmSelect = () => {
    const missionStartRow = rundownData.find(
      (row) =>
        row.model === 'MissionStart' &&
        row.missionId === String(selectedMissionId)
    );

    if (missionStartRow) {
      // 跟流程圖的跳關同一條路：進歷史，← 才回得來
      goToId(keyOf(missionStartRow));
      setCurrentMissionId(missionStartRow.missionId);
      updateMissionStatus(missionStartRow.missionId, 'solving');
    }

    setDialogOpen(false);
  };

  const handleMultiClick = (index, title) => () => {
    clickCountRef.current += 1;

    if (clickCountRef.current === 10) {
      handleMissionSelect(index, title);
      clickCountRef.current = 0;
    }

    // 設置計時器，2 秒內沒點擊就重置
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2000);
  };

  return (
    <PageContainer>
      <PageTitleText title="關卡" />
      <MissionList
        missions={displayMissions}
        currentMissionId={currentMissionId}
        onMissionSelect={handleMissionSelect}
        onMultiClick={handleMultiClick}
      />

      {/* 跳關確認 Dialog */}
      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirmSelect}
        title={`確定要移動到${selectedMissionTitle}嗎？`}
        confirmText={`移動不會影響答題狀態喔～`}
      />
    </PageContainer>
  );
};

export default MissionPage;
