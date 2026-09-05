import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { chromeMotionSx, useChromeHidden } from '../../hook/useChromeMotion';

/**
 * 給 GameShell 用的包裝：這個 Box **自己就是那個定位元素**（sx 傳定位進來），
 * 所以位移下在它身上不會影響任何人。
 *
 * ZoomableImage 的縮小鈕不能用這個——那顆是 position:fixed，得把樣式直接下在
 * 按鈕上，所以它用 chromeMotionSx。
 */
const ChromeFade = ({
  children,
  from = 'top',
  hideWithOverlay = false,
  instantExit = false,
  sx,
  ...rest
}) => {
  const { overlayOpen, chromeHidden } = useChromeHidden();
  const hidden = hideWithOverlay ? overlayOpen : chromeHidden;
  return (
    <Box {...rest} sx={{ ...sx, ...chromeMotionSx(hidden, { from, instantExit }) }}>
      {children}
    </Box>
  );
};

ChromeFade.propTypes = {
  children: PropTypes.node,
  from: PropTypes.oneOf(['top', 'bottom']),
  hideWithOverlay: PropTypes.bool,
  instantExit: PropTypes.bool,
  sx: PropTypes.object,
};

export default ChromeFade;
