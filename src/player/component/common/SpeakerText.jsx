import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const SpeakerText = ({ speaker }) => (
  <Typography variant="h5" align="left" sx={{ color: '#fff', width: '100%' }}>
    {speaker}
  </Typography>
);

SpeakerText.propTypes = {
  speaker: PropTypes.string.isRequired,
};

export default SpeakerText;
