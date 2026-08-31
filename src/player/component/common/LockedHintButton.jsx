import { Box, Button } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PropTypes from 'prop-types';

const LockedHintButton = ({ index, onUnlock }) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={() => onUnlock(index)}
        startIcon={<LockRoundedIcon />}
      >
        解鎖提示 {index + 1}
      </Button>
    </Box>
  );
};

LockedHintButton.propTypes = {
  index: PropTypes.number.isRequired,
  onUnlock: PropTypes.func.isRequired,
};

export default LockedHintButton;
