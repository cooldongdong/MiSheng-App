import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const QuestionText = ({ text }) => (
  <Typography
    variant="body2"
    align="left"
    sx={{ color: '#fff', height: '120px', overflowY: 'auto' }}
  >
    {text}
  </Typography>
);

export default QuestionText;

QuestionText.propTypes = {
  text: PropTypes.string.isRequired,
};
