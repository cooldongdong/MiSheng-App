import { useContext } from 'react';
import { Box, Stack } from '@mui/material';
import { GameContext } from '../store/game-context';
import PropTypes from 'prop-types';
import FloatingLayer from '../component/layer/FloatingLayer';
import Layer from '../component/layer/Layer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import MissionTitleText from '../component/common/MissionTitleText';
import TalkText from '../component/common/TalkText';
import EndIconButton from '../component/common/EndIconButton';

// 遊戲封面。資料來自 **config**，不是某一關。
//
// 為什麼要有這個 model
// -------------------
// 在這之前，封面是「mission 表裡一列 id=0 的假關卡」，再靠
// `filter(row => row.id > 0)` 從關卡清單藏起來。用「關卡由什麼構成」逐項核對：
// 提示 0 則、道具 0 個、故事 0 篇、沒有答案、沒有地點、rundown 只有那一列
// MissionStart——**交集是零**。唯一的交集是「它需要一個標題和一張背景圖」，
// 而那不是關卡的性質，是 mission 表剛好有這兩欄。
//
// ⇒ 封面不是被分類成關卡，**它是借用了關卡這個容器**。
//   而一個要靠過濾器藏起來的東西本來就不屬於那張表——**過濾器是分類錯誤的收據。**
//
// 為什麼是新 model，不是「missionId 空白＝封面」
// --------------------------------------------
// 兩個理由，第二個比第一個硬：
//
// ① **用空白表達意圖，等於放棄偵測錯誤的能力。** 創作者忘了填 missionId 的
//    MissionStart，會跟他刻意做的封面長得一模一樣，validator 再也不能說
//    「你這一列忘了填」。而那個狀態剛咬過一次——MissionStartModel 讀
//    `currentMission.navigation` 造成的白畫面，成因正是「找不到對應關卡」。
// ② **空白這個位置已經被別的意思佔走了。** rundown 的 missionId 空白代表
//    「沿用上一關」，demo 有 481 列是這樣（關卡中間的每一句對白）。
//
// 跟 MissionStart 的差別
// ---------------------
// | | GameStart | MissionStart |
// | 資料來源 | config | mission 那一列 |
// | missionId | 必須空白 | 必須有 |
// | 關卡清單 | 不是關卡，不出現 | 出現 |
// | 副標題 | 不支援（Dong 拍板） | 有 |
// | 導航按鈕 | 沒有（遊戲不會只有一個地點） | 有 |
// | 計時 | 不啟動（封面不是一關，沒有 hint.timer 要算） | startMission() |
//
// **加 model 是純增量**：既有試算表一格都不用動，照舊用 mission 0 當封面。
const GameStart = ({ onNext, canProceed, hideContent = false }) => {
  const { getImg, configData } = useContext(GameContext);
  const config = configData?.[0];

  return (
    <FloatingLayer>
      {config?.backgroundImg && (
        <Layer>
          <BackgroundLayer src={getImg(config.backgroundImg)} opacity="0.9" />
        </Layer>
      )}

      {/* hideContent 見 TalkModel 檔頭——上下拉露出來的那一頁是還沒發生的事 */}
      {!hideContent && (
        <Layer>
          <Box
            sx={{
              width: '100%',
              padding: '7%',
              boxSizing: 'border-box',
              position: 'absolute',
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'left',
            }}
          >
            {/* config 一定有 title（validator 擋著），所以這裡不需要
                MissionStart 那種「正在載入任務資料…」的 null 分支 */}
            <MissionTitleText title={config?.title || ''} />
            {config?.description && (
              <TalkText
                text={config.description}
                height="auto"
                textShadow="0px 3px 6px rgba(0, 0, 0, 0.5)"
              />
            )}

            <Stack direction="row" spacing={2} sx={{ mt: '10px' }}>
              {canProceed && (
                <EndIconButton onClick={onNext}>開始遊戲</EndIconButton>
              )}
            </Stack>
          </Box>
        </Layer>
      )}
    </FloatingLayer>
  );
};

GameStart.propTypes = {
  hideContent: PropTypes.bool,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default GameStart;
