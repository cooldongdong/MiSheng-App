import { useContext } from 'react';
import { Box, Stack, Typography } from '@mui/material';
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

const MissionStart = ({ onNext, canProceed }) => {
  const { getImg, getMissionById, currentMissionId } = useContext(GameContext);
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
            <Typography variant="h6" gutterBottom>
              正在載入任務資料...
            </Typography>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: '10px' }}>
            {currentMission.navigation && (
              <EndIconButton
                href={currentMission.navigation}
                endIcon={<AssistantDirectionRoundedIcon />}
              >
                導航
              </EndIconButton>
            )}
            {canProceed && (
              <EndIconButton onClick={onNext}>開始遊戲</EndIconButton>
            )}
          </Stack>
        </Box>
      </Layer>
    </FloatingLayer>
  );
};

// 定義 propTypes
MissionStart.propTypes = {
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default MissionStart;
