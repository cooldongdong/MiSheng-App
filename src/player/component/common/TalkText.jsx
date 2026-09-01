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
      // **不要改成 pan-y。** 宣告 pan-y 等於把垂直手勢整段交給瀏覽器，
      // 而瀏覽器在手指按下那一刻就決定歸屬、不會中途交還——於是「對白捲到底
      // 就能翻頁」永遠不會發生（Android 實測）。維持 none，捲動由 useSwipeFlow
      // 自己做，到底之後它才把剩下的位移轉成翻頁。
      touchAction: 'none',
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
