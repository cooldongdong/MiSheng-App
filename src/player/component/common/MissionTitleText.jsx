import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const MissionTitleText = ({ title }) => (
  <Typography
    gutterBottom
    align="left"
    sx={{
      fontFamily: "'Noto Serif TC', serif",
      fontWeight: 900,
      fontSize: '48px',
      color: '#fff',
      textShadow: '0px 6px 8.4px rgba(0, 0, 0, 0.5)',
    }}
  >
    {title || ''}
  </Typography>
);

MissionTitleText.propTypes = {
  title: PropTypes.string.isRequired,
};

export default MissionTitleText;
