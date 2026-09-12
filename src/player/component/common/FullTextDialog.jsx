import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';
import { gameOverlayContainer } from './layout';

const FullTextDialog = ({ open, onClose, title, text }) => {
  return (
    // data-no-swipe：對話框開著的時候，上下滑不該翻頁。
    //
    // 玩家把全文叫出來就是為了讀它，這時候的滑動意圖是捲文字或什麼都不做，
    // 不是離開這一頁（Dong 2026-09-02 回報）。useSwipeFlow 的 onPointerDown 會
    // 用 closest('[data-no-swipe]') 往上找，ZoomableImage 早就是這樣標的——
    // 用同一個機制，不要為這件事發明第二套。
    //
    // 標在 Dialog 的根元素（額外的 prop 會被 MUI 傳到那裡），這樣**背景遮罩也包含
    // 在內**——只標在紙張上的話，滑在遮罩上仍然會翻頁。
    <Dialog
      data-no-swipe
      // container 的理由見 layout.js 的 GAME_OVERLAY_ID：
      // portal 不是後代，所以 #main-container 的 transform 關不住它
      container={gameOverlayContainer}
      open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle>{title ? title : '提示'}</DialogTitle>

      <DialogContent>
        <Typography>{text}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

FullTextDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  text: PropTypes.string.isRequired,
};

export default FullTextDialog;
