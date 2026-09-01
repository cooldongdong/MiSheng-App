import { forwardRef } from 'react';
import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const TalkText = forwardRef(({ text, height = '120px', textShadow }, ref) => (
  <Typography
    variant="body2"
    align="left"
    gutterBottom
    ref={ref}
    sx={{
      whiteSpace: 'pre-wrap',
      color: '#fff',
      height: height,
      overflowY: 'auto',
      // 同 ContentList：外層是 touch-action:none，這裡要把垂直捲動要回來
      touchAction: 'pan-y',
      textShadow: textShadow,
    }}
  >
    {text}
  </Typography>
));

TalkText.displayName = 'TalkText';

TalkText.propTypes = {
  text: PropTypes.string.isRequired,
  height: PropTypes.string,
  textShadow: PropTypes.string,
};

export default TalkText;
