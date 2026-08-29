import { useContext } from 'react';
import { GameContext } from '../../store/game-context';
import { Box, Button, Paper, Typography } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import PendingRoundedIcon from '@mui/icons-material/PendingRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import PersonPinCircleRoundedIcon from '@mui/icons-material/PersonPinCircleRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import Layer from '../layer/Layer';
import BackgroundLayer from '../layer/BackgroundLayer';
import PropTypes from 'prop-types';

const MissionItem = ({ mission, isActive, onSelect, onMultiClick }) => {
  const { getImg } = useContext(GameContext);
  return (
    <Paper
      elevation={mission.status ? 8 : 0}
      sx={{
        display: 'flex',
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        height: '70px',
        minHeight: '70px',
      }}
      onClick={onMultiClick(mission.id, mission.subtitle || mission.title)}
    >
      {/* Background */}
      <Layer>
        {mission.status ? (
          <BackgroundLayer src={getImg(mission.backgroundImg)} />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              background: '#37474F',
              opacity: '50%',
            }}
          />
        )}
      </Layer>

      {/* Gradient Overlay */}
      {mission.status && (
        <Layer>
          <Box
            sx={{
              background: 'linear-gradient(-90deg,transparent 0%, #37474F 90%)',
              width: '70%',
              height: '100%',
            }}
          />
        </Layer>
      )}

      {/* Title & Status Icon */}
      <Layer>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            pl: '20px',
            color: '#fff',
            opacity: isActive ? 1 : 0.5,
          }}
        >
          {isActive ? (
            <PersonPinCircleRoundedIcon />
          ) : mission.status === 'solving' ? (
            <PendingRoundedIcon />
          ) : mission.status === 'complete' ? (
            <CheckCircleOutlineRoundedIcon />
          ) : (
            <BlockRoundedIcon />
          )}

          <Typography
            align="left"
            sx={{
              fontFamily: "'Noto Serif TC', serif",
              fontWeight: 600,
              fontSize: '24px',
              color: '#fff',
              marginLeft: '6px',
            }}
          >
            {mission.subtitle || mission.title}
          </Typography>
        </Box>
      </Layer>

      {/* Button */}
      <Layer>
        <Button
          disabled={!mission.status}
          onClick={onSelect}
          sx={{
            width: '100%',
            height: '100%',
            color: '#fff',
            display: 'flex',
            justifyContent: 'end',
            pr: '20px',
            opacity: isActive ? 1 : 0.5,
          }}
        >
          <ArrowForwardRoundedIcon
            sx={{ filter: 'drop-shadow(2px 2px 5px rgba(0, 0, 0, 0.3))' }}
          />
        </Button>
      </Layer>
    </Paper>
  );
};

MissionItem.propTypes = {
  mission: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    status: PropTypes.oneOf(['solving', 'complete', 'incomplete', '']),
    backgroundImg: PropTypes.string,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onMultiClick: PropTypes.func,
};

export default MissionItem;
