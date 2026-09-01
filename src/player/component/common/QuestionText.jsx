import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const QuestionText = ({ text }) => (
  <Typography
    variant="body2"
    align="left"
    // touchAction 維持 none（**不要改成 pan-y**）：捲動由 useSwipeFlow 自己做，
    // 捲到底才交棒給翻頁。理由見 TalkText。
    sx={{
      color: '#fff',
      height: '120px',
      overflowY: 'auto',
      touchAction: 'none',
    }}
  >
    {text}
  </Typography>
);

export default QuestionText;

QuestionText.propTypes = {
  text: PropTypes.string.isRequired,
};
