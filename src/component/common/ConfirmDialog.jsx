import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';

// 對話框開著時 Enter 要按到哪一顆，由對話框自己決定，不靠 autoFocus。
//
// autoFocus 只在 mount 那一刻作用，而 MUI 的 Dialog 開起來之後焦點是落在它那層
// tabindex="-1" 的容器上——實測按 Enter 什麼都沒發生。改成聽整個對話框的 keydown，
// 就跟焦點停在哪裡無關了。
//
// 例外是焦點真的在某顆按鈕上（使用者自己 Tab 過去）：那時 Enter 由瀏覽器觸發那顆鈕，
// 這裡再處理一次就會送出兩次。
const enterHandler = (action) => (event) => {
  if (!action) return;
  if (event.key !== 'Enter') return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  if (event.nativeEvent?.isComposing) return;
  if (event.target.closest?.('button')) return;
  event.preventDefault();
  action();
};

// confirmOnEnter：讓「確定」開著就拿到焦點，於是 Enter 直接確認。
//
// 預設關閉，只給答題流程用（送出、放棄）——那條動線本來就是「打字 → Enter」，
// 中間插一個非得用滑鼠點的確認框會很突兀。清 localStorage 那種不可逆的操作不給，
// 它應該要求你真的伸手去點那一下。
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  confirmText,
  confirmOnEnter = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      onKeyDown={confirmOnEnter ? enterHandler(onConfirm) : undefined}
    >
      <DialogTitle>{title || '提示'}</DialogTitle>
      <DialogContent>
        <Typography>{confirmText}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onConfirm} color="error">
          確定
        </Button>
        <Button onClick={onClose} color="primary">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  title: PropTypes.string,
  confirmText: PropTypes.string.isRequired,
  confirmOnEnter: PropTypes.bool,
};

export default ConfirmDialog;
