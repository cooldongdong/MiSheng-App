import { useContext, useMemo } from 'react';
import { GameContext } from '../store/game-context';
import { storyRowsOf } from '../../shared/storyFlag';
import { normId } from '../../shared/rowKey';

// 目前這一關，從 rundown 收進故事頁的列。
//
// **故事頁與導覽列的紅點共用這一支。** 兩邊各算一次的話，某天其中一邊多了一個條件，
// 紅點就會說「有 2 篇」而點進去只有 1 篇——那種落差玩家只會覺得壞掉了。
//
// 還沒解完的關卡回傳空陣列：rundown 的 story 列是「解完才收」（理由見 StoryPage）。
export const useMissionStories = () => {
  const { rundownData, playerMissionData, getMissionById, currentMissionId } =
    useContext(GameContext);
  const mission = getMissionById(currentMissionId);

  // 所屬關卡怎麼算（空白＝沿用上一關）見 storyRowsOf。
  // 關卡用 getMissionById 認：跟播放器走流程時判斷「現在在哪一關」同一支，
  // 0 算不算真關卡也一併跟著它。
  const collectedRows = useMemo(
    () => storyRowsOf(rundownData, (v) => getMissionById(v)?.id ?? null),
    [rundownData, getMissionById]
  );

  const solved =
    !!mission &&
    (playerMissionData || []).some(
      (m) => normId(m.id) === normId(mission.id) && m.status === 'complete'
    );

  const rows = useMemo(
    () =>
      solved
        ? collectedRows
            .filter(({ missionId }) => normId(missionId) === normId(mission.id))
            .map(({ row }) => row)
        : [],
    [solved, collectedRows, mission]
  );

  return { mission, rows };
};
