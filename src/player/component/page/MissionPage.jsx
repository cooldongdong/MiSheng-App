import { useContext, useEffect, useState, useRef } from 'react';
import { keyOf } from '../../../shared/rowKey';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import MissionList from '../common/MissionList';
import ConfirmDialog from '../common/ConfirmDialog';

// 舊試算表的封面關。
//
// mission id = '0' **不是哨兵值**，它是一列真的關卡列，內容是遊戲封面
// （demo 的 mission[0].title 跟 config.title 一模一樣，而它底下 0 則提示、
// 0 個道具、0 篇故事，rundown 只有那一列 MissionStart）。
// 它只是借用關卡的資料結構顯示一張封面，再靠過濾器藏起來。
//
// 正解是新的 GameStart model、封面資料改由 config 供（COO-179）。
// 在那之前——以及那之後，為了既有試算表——這一條要留著，
// 但它的身分是**後路，不是規則**：新遊戲不該再有 mission 0。
const LEGACY_COVER_MISSION_ID = '0';

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
    // 原本寫 `row.id > 0`——那是「mission.id 一定是數字」的遺留。
    // `'第三章' > 0` 是 false，於是用語意名字當關卡 id 的遊戲，
    // 整個關卡頁會空掉（COO-178）。
    //
    // 這個過濾器真正要表達的是兩件事，跟數值大小無關：
    // ① 沒有 id 的列不列出來（沒有人指得到它，validator 也會擋）
    // ② 舊資料的封面關不列出來
    const filterMissions = missionData.filter((row) => {
      const id = String(row.id ?? '').trim();
      return id !== '' && id !== LEGACY_COVER_MISSION_ID;
    });
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

  // 收到的是 mission.id（見 MissionItem 的 onMultiClick(mission.id, ...)），
  // 不是陣列位置——原本的參數名叫 index，在 id 可以是語意名字之後特別容易誤導。
  const handleMultiClick = (missionId, title) => () => {
    clickCountRef.current += 1;

    if (clickCountRef.current === 10) {
      handleMissionSelect(missionId, title);
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
