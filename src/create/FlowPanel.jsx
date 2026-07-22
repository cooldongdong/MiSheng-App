import { useContext } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { GameContext } from '../store/game-context';
import FlowMap from './FlowMap';

// 並排模式的右半邊：流程圖 ＋ 遊戲的雙向連動
//   - 遊戲走到哪 → 圖上高亮並自動捲過去（currentId）
//   - 點圖上的方塊 → 遊戲直接跳到那一頁（setCurrentId）
//
// 掛在 GameProvider 裡面才拿得到 currentId／setCurrentId，
// 所以是用 GameShell 的 sidePanel 插進去，而不是自己另外包一層。
const FlowPanel = ({ rundownRows }) => {
  const { currentId, setCurrentId, setCurrentMissionId, rundownData } =
    useContext(GameContext);

  const jumpTo = (id) => {
    setCurrentId(id);
    // 跳過去的那一列若屬於某個關卡，關卡狀態也要跟著換，
    // 不然提示／道具頁會停在上一關
    const row = (rundownData || []).find((r) => String(r.id) === String(id));
    if (row?.missionId) setCurrentMissionId(String(row.missionId));
  };

  return (
    <Box sx={{ px: 2, pb: 2, height: '100%', boxSizing: 'border-box' }}>
      <FlowMap
        rundownRows={rundownRows}
        activeId={currentId ? String(currentId) : null}
        onNodeClick={jumpTo}
        dense
      />
    </Box>
  );
};

FlowPanel.propTypes = {
  rundownRows: PropTypes.array.isRequired,
};

export default FlowPanel;
