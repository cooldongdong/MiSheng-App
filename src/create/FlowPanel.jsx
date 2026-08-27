import { useContext, useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { GameContext } from '../store/game-context';
import FlowMap from './FlowMap';
import { buildSpatialNav } from './spatialNav';

// 並排模式的右半邊：流程圖 ＋ 遊戲的雙向連動
//   - 遊戲走到哪 → 圖上高亮並自動捲過去（currentId）
//   - 點圖上的方塊 → 遊戲直接跳到那一頁（goToId）
//
// 掛在 GameProvider 裡面才拿得到 currentId／goToId，
// 所以是用 GameShell 的 sidePanel 插進去，而不是自己另外包一層。
const FlowPanel = ({ rundownRows, toolbarActions = null }) => {
  const {
    currentId,
    goToId,
    setCurrentMissionId,
    rundownData,
    missionData,
    mapMode,
    setMapMode,
    setSpatialNav,
  } = useContext(GameContext);

  // 圖一變（換資料、摺疊開關）就換一份導覽函式。節點集合要跟畫面上看到的一致，
  // 所以這件事只能由畫圖的那一邊來報——外面自己再算一次不保證算出同一張圖。
  const handleGraphReady = useCallback(
    (graph) => setSpatialNav(graph ? buildSpatialNav(graph.nodes) : null),
    [setSpatialNav]
  );

  // 流程圖收起來時把導覽收回去，並切回照流程走。
  //
  // 看不到圖還留在地圖模式等於叫人盲操——方向鍵會往一個你看不見的方向跳。
  // 順帶讓鍵盤提示列跟著消失（它掛在 spatialNav 上），收起流程圖的人多半是想
  // 專心看遊戲本身，那一列字這時候只是雜訊。鍵盤功能本身還在，只是不再喊。
  useEffect(
    () => () => {
      setSpatialNav(null);
      setMapMode(false);
    },
    [setSpatialNav, setMapMode]
  );

  // 大綱裡的關卡直接顯示關卡名稱，比「第 49 列」有用得多
  const missionTitles = useMemo(() => {
    const map = {};
    for (const m of missionData || []) {
      const label = [m.subtitle, m.title].filter(Boolean).join(' ').trim();
      if (m.id && label) map[String(m.id)] = label;
    }
    return map;
  }, [missionData]);

  const jumpTo = (id) => {
    // 走 goToId 而不是 setCurrentId：跳過去看一眼之後，← 要回得來
    goToId(id);
    // 跳過去的那一列若屬於某個關卡，關卡狀態也要跟著換，
    // 不然提示／道具頁會停在上一關
    const row = (rundownData || []).find((r) => String(r.id) === String(id));
    if (row?.missionId) setCurrentMissionId(String(row.missionId));
  };

  return (
    <Box sx={{ height: '100%' }}>
      <FlowMap
        rundownRows={rundownRows}
        activeId={currentId ? String(currentId) : null}
        onNodeClick={jumpTo}
        missionTitles={missionTitles}
        toolbarActions={toolbarActions}
        onGraphReady={handleGraphReady}
        mapMode={mapMode}
        onToggleMapMode={() => setMapMode((v) => !v)}
        dense
      />
    </Box>
  );
};

FlowPanel.propTypes = {
  rundownRows: PropTypes.array.isRequired,
  toolbarActions: PropTypes.node,
};

export default FlowPanel;
