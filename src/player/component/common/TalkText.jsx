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
