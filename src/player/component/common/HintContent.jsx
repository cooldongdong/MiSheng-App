import { useState, useContext } from 'react';
import { GameContext } from '../../store/game-context';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import ZoomableImage from './ZoomableImage';
import PropTypes from 'prop-types';

const HintContent = ({ hint, index }) => {
  const { getImg } = useContext(GameContext);
  const { speaker, avatar, text, img } = hint;
  const hasSpeaker = Boolean(speaker);
  const [fullScreenIndex, setFullScreenIndex] = useState(null);

  return (
    <Box sx={{ display: 'flex', alignItems: 'top' }}>
      {hasSpeaker && (
        <Avatar alt={speaker} src={getImg(avatar)} sx={{ mr: '8px' }} />
      )}
      <Stack spacing={1}>
        {hasSpeaker && (
          <Typography
            variant="body1"
            align="left"
            sx={{
              height: '40px',
              lineHeight: '40px',
              fontWeight: 'bold',
            }}
          >
            {speaker}
          </Typography>
        )}
        <Typography align="left">{text}</Typography>
        {img && (
          <ZoomableImage
            key={index}
            src={getImg(img)}
            alt={`Image ${index + 1}`}
            elevation={0}
            isFullScreen={fullScreenIndex === index}
            showZoomButton={fullScreenIndex === null}
            onToggle={() =>
              setFullScreenIndex(fullScreenIndex === index ? null : index)
            }
          />
        )}
      </Stack>
    </Box>
  );
};

HintContent.propTypes = {
  hint: PropTypes.shape({
    speaker: PropTypes.string,
    avatar: PropTypes.string,
    text: PropTypes.string.isRequired,
    img: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default HintContent;
