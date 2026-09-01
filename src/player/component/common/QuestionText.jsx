import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const QuestionText = ({ text }) => (
  <Typography
    variant="body2"
    align="left"
    // touchAction：外層 swipe 容器是 none，可捲區要自己把垂直捲動要回來
    sx={{
      color: '#fff',
      height: '120px',
      overflowY: 'auto',
      touchAction: 'pan-y',
    }}
  >
    {text}
  </Typography>
);

export default QuestionText;

QuestionText.propTypes = {
  text: PropTypes.string.isRequired,
};
