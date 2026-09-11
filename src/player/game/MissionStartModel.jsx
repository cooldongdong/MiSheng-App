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
  const { getImg, getMissionById, currentMissionId } =
    useContext(GameContext);
  const currentMission = getMissionById(currentMissionId);

  return (
    <FloatingLayer>
      {/* **這一層永遠要畫，不能用 backgroundImg 當開關。**
          BackgroundLayer 自己備好了三種狀態的底（沒填圖／載失敗／還在載），
          註解就寫在它的檔案裡；而原本的 `backgroundImg &&` 把第一種擋在門外——
          於是沒填圖的關卡拿不到那塊中性深灰，MissionTitleText 與 MissionSubtitleText
          寫死的 `color:'#fff'` 就變成白字畫在 FloatingLayer 的白卡上，**整頁看起來
          是空白的**（Dong 2026-09-11 在測試遊戲的第二頁撞到，只能從關卡頁繞過去）。
          demo 六關每一關都填了 backgroundImg，所以這個洞從來沒被踩到。
          Talk 沒事是因為它走 ThemeColorLayer（dialogue.surface 深墨），
          MissionStart 走 FloatingLayer，沒有那層底。 */}
      <Layer>
        <BackgroundLayer
          src={currentMission?.backgroundImg ? getImg(currentMission.backgroundImg) : ''}
          opacity="0.9"
        />
      </Layer>

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
                //
                // **`?? ''` 不是多餘的防禦。** 少了它，只要 subtitle 是 undefined，
                // 這一行就丟 TypeError 而整個遊戲畫面全白——而 undefined 比想像中
                // 容易出現：CSV 檔尾多一個換行、或創作者的試算表少了 subtitle 欄，
                // 都會產生「有這一列、但沒有這一格」的資料。
                // 根因擋在 getMissionById（空 id 不再匹配），這裡是第二道：
                // **播放器不該因為試算表少一格就壞掉，那是 validator 的工作。**
                subtitle={
                  (currentMission.subtitle ?? '').length <= 3
                    ? (currentMission.subtitle ?? '')
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
              /* 計時起點（hint.timer 的「進關後幾分鐘」）**不在這裡**，在
                 GameController.handleNext——理由見那邊的註解。簡短版：
                 「停留很久的說明時間不該算進去」是對的，但這一頁本來就可以用滑的
                 翻過去，把計時綁在這顆按鈕上等於滑過去的人永遠不會開始倒數。
                 onNext 就是 handleNext，所以按這顆一樣會啟動，只是不再只認它。 */
              <EndIconButton onClick={onNext}>開始遊戲</EndIconButton>
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
