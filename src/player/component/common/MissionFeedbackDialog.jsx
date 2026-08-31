import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';

// 見 ConfirmDialog 的同名函式：不靠 autoFocus，聽整個對話框的 keydown
const enterHandler = (action) => (event) => {
  if (event.key !== 'Enter') return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (event.nativeEvent?.isComposing) return;
  if (event.target.closest?.('button')) return;
  event.preventDefault();
  action();
};

const MissionFeedbackDialog = ({
  open,
  onClose,
  isAnswerCorrect,
  isGiveUp,
  feedback,
}) => {
  return (
    <Dialog open={open} onClose={onClose} onKeyDown={enterHandler(onClose)}>
      {isGiveUp ? (
        <DialogTitle>再接再厲！</DialogTitle>
      ) : (
        <DialogTitle>{isAnswerCorrect ? '恭喜！' : '提示'}</DialogTitle>
      )}
      <DialogContent>
        <Typography>{feedback}</Typography>
      </DialogContent>
      <DialogActions>
        {/* Enter 直接關掉。答錯了要再試一次、答對了要往下走，
            兩種情況的下一個動作都在鍵盤上，不該為了關一個框去摸滑鼠。 */}
        <Button onClick={onClose} color="primary">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

MissionFeedbackDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  isAnswerCorrect: PropTypes.bool.isRequired,
  isGiveUp: PropTypes.bool,
  feedback: PropTypes.string.isRequired,
};

export default MissionFeedbackDialog;
