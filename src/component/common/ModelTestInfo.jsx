import { useContext, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { GameContext } from '../../store/game-context';
import IconButton from '@mui/material/IconButton';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ConfirmDialog from './ConfirmDialog';
import PropTypes from 'prop-types';

const ModelTestInfo = ({ model }) => {
  const { gameId, clearGameData } = useContext(GameContext);
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '600px',
        // absolute 而非 fixed：並排流程圖時才不會跨到右半邊、擋住工具列
        position: 'absolute',
        top: '0',
        zIndex: '99',
        boxSizing: 'border-box',
        padding: '20px',
      }}
    >
      <Box
        sx={{
          width: '76%',
          boxSizing: 'border-box',
          margin: 'auto',
          color: '#777',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => setDialogOpen(true)}
          aria-label="restart"
        >
          <RestartAltRoundedIcon fontSize="inherit" />
        </IconButton>
        <Typography variant="body1">Current Model: {model}</Typography>
        <ConfirmDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onConfirm={() => clearGameData(gameId)}
          title={'確定清除？'}
          confirmText={`確定要清除 ${gameId} 的 localStorage 資料並重新整理頁面嗎？`}
        />
      </Box>
    </Box>
  );
};

export default ModelTestInfo;

ModelTestInfo.propTypes = {
  model: PropTypes.string,
};
