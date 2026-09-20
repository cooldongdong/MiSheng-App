import { useContext } from 'react';
import { GameContext } from '../../store/game-context';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import ZoomableImage from './ZoomableImage';
import PropTypes from 'prop-types';

// 哪一張圖正在放大，是**整頁一份**的狀態，由 HintPage 持有（同 PropPage／StoryPage）。
//
// 原本這個 state 就放在這個元件裡，於是每一則提示各有一份：放大第二則的圖時，
// 第一則的 fullScreenIndex 仍然是 null，它的放大鈕照樣被畫出來——而那顆鈕的
// z-index 是 1101、FullscreenStage 是 1000，所以它會浮在放大的圖上面，還按得下去
//（Dong 2026-09-20 回報）。
//
// 「同時只有一張圖在放大」是整頁的不變式，所以那份狀態只能有一個持有者。
const HintContent = ({ hint, index, fullScreenIndex, onToggleFullScreen }) => {
  const { getImg } = useContext(GameContext);
  const { speaker, avatar, text, img } = hint;
  const hasSpeaker = Boolean(speaker);

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
            onToggle={() => onToggleFullScreen(index)}
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
  fullScreenIndex: PropTypes.number,
  onToggleFullScreen: PropTypes.func.isRequired,
};

export default HintContent;
