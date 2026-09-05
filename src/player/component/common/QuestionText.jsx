import { Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { useTypewriterEffect } from '../../animation/useTypewriterEffect';

// 打字機跑在這裡，不在 QuizModel 裡——理由見 TalkText 的檔頭：
// 放在 model 的話，每打一個字整棵子樹（底圖、立繪、漸層、選項）都要重繪。
const TYPE_SPEED_MS = 50;

const QuestionText = ({ text, typeMode = 'instant' }) => {
  const displayText = useTypewriterEffect(text || '', TYPE_SPEED_MS, typeMode);
  return (
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
      {displayText}
    </Typography>
  );
};

export default QuestionText;

QuestionText.propTypes = {
  text: PropTypes.string,
  typeMode: PropTypes.oneOf(['type', 'instant', 'silent']),
};
