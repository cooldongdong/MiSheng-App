import { useContext } from 'react';
import { Box, Stack } from '@mui/material';
import { GameContext } from '../store/game-context';
import PropTypes from 'prop-types';
import FloatingLayer from '../component/layer/FloatingLayer';
import Layer from '../component/layer/Layer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import MissionSubtitleText from '../component/common/MissionSubtitleText';
import MissionTitleText from '../component/common/MissionTitleText';
import TalkText from '../component/common/TalkText';
import AssistantDirectionRoundedIcon from '@mui/icons-material/AssistantDirectionRounded';
import EndIconButton from '../component/common/EndIconButton';

const MissionStart = ({ onNext, canProceed, hideContent = false }) => {
  const { getImg, getMissionById, currentMissionId, startMission } =
    useContext(GameContext);
  const currentMission = getMissionById(currentMissionId);

  return (
    <FloatingLayer>
      {currentMission?.backgroundImg && (
        <Layer>
          <BackgroundLayer
            src={getImg(currentMission.backgroundImg)}
            opacity="0.9"
          />
        </Layer>
      )}

      {/* hideContent 見 TalkModel 檔頭——關卡名本身也是還沒發生的事 */}
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
          {currentMission ? (
            <>
              <MissionSubtitleText
                // 暫時性的不顯示副標題
                subtitle={
                  currentMission.subtitle.length <= 3
                    ? currentMission.subtitle
                    : ''
                }
              />

              <MissionTitleText title={currentMission.title} />
              {currentMission.description && (
                <TalkText
                  text={currentMission.description || ''}
                  height="auto"
                  textShadow="0px 3px 6px rgba(0, 0, 0, 0.5)"
                />
              )}
            </>
          ) : (
            // 指不到關卡時什麼都不畫。
            //
            // 這裡原本寫「正在載入任務資料...」，但那句話有兩個問題：
            // ① 真正指不到關卡的原因不是「還在載入」，是創作者漏填 missionId
            //    ——而那現在是 validator 的 error，不會走到播放器來。
            // ② 剩下唯一會走到這裡的是**同步的那一幀**：currentMissionId 的初始值
            //    是 ''，要等 GameController 的 effect 才會跟上這一列的 missionId。
            //    在那一幀秀出「正在載入」，等於每次開場都閃一下一句假話。
            null
          )}

          <Stack direction="row" spacing={2} sx={{ mt: '10px' }}>
            {/* 上面那段有「正在載入任務資料…」的 null 防護，但它只包到三元運算式裡，
                這一行在外面。missionId 指不到關卡時（例如 currentMissionId 還是
                初始的 '0'，而這份遊戲的關卡從 1 開始）整個元件會爆掉、畫面全黑。
                demo 剛好有一列 id=0 的關卡，所以一直沒被撞到。 */}
            {currentMission?.navigation && (
              <EndIconButton
                href={currentMission.navigation}
                endIcon={<AssistantDirectionRoundedIcon />}
              >
                導航
              </EndIconButton>
            )}
            {canProceed && (
              /* 按下這一刻＝這一關的計時起點（hint.timer 用它算「進關後幾分鐘」）。
                 記在按鈕上而不是「走到這一列時」，是因為 MissionStart 這一頁可能
                 停留很久——玩家在讀關卡說明、看導覽連結，那段時間不該算進去。 */
              <EndIconButton
                onClick={() => {
                  startMission(currentMissionId);
                  onNext();
                }}
              >
                開始遊戲
              </EndIconButton>
            )}
          </Stack>
        </Box>
      </Layer>
      )}
    </FloatingLayer>
  );
};

// 定義 propTypes
MissionStart.propTypes = {
  hideContent: PropTypes.bool,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default MissionStart;
