import { Box } from '@mui/material';
import PropTypes from 'prop-types'; // 引入 PropTypes

// 預設底色走 palette.dialogue.surface——它在兩種模式下是同一個值（故事畫面刻意不隨
// 模式翻，見 theme.js）。寫死的話就會有兩份真相，而這裡改不到的那一份會先腐爛。
function ThemeColorLayer({ children, bgc = 'dialogue.surface' }) {
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        backgroundColor: bgc,
        overflow: 'hidden',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {children}
    </Box>
  );
}

ThemeColorLayer.propTypes = {
  children: PropTypes.node.isRequired,
  bgc: PropTypes.string,
};

export default ThemeColorLayer;
