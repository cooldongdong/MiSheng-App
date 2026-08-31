import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const MissionSubtitleText = ({ subtitle }) => (
  <Typography
    align="left"
    sx={{
      fontFamily: "'Noto Serif TC', serif",
      fontWeight: 600,
      fontSize: '28px',
      color: '#fff',
      marginLeft: '2px',
      textShadow: '0px 3px 4.2px rgba(0, 0, 0, 0.5)',
    }}
  >
    {subtitle || ''}
  </Typography>
);

MissionSubtitleText.propTypes = {
  subtitle: PropTypes.string.isRequired,
};

export default MissionSubtitleText;
