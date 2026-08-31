import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
} from '@mui/material';
import PropTypes from 'prop-types';

const FullTextDialog = ({ open, onClose, title, text }) => {
  return (
    <Dialog open={open} onClose={onClose} 
    maxWidth="sm"
    >
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
