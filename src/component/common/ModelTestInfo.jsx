import { useContext, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { GameContext } from '../../store/game-context';
import IconButton from '@mui/material/IconButton';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ConfirmDialog from './ConfirmDialog';
import PropTypes from 'prop-types';

const ModelTestInfo = ({ model, hint = null }) => {
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

      {/* 鍵盤翻頁的說明就借用這一列——它本來就是開發資訊列，
          不必為了一句提示另外開一塊 UI。回退後換成「狀態沒倒回」的但書，
          同一個位置兩用。 */}
      {hint && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: '2px' }}>
          <Typography
            variant="caption"
            sx={{
              // 這行字坐在遊戲插圖上，純灰字會被背景吃掉——墊一層半透明才讀得到。
              // 同一招用在 /demo 右上角的外觀開關（App.jsx）。
              px: 1,
              borderRadius: 2,
              bgcolor: 'background.overlay',
              color: 'text.secondary',
            }}
          >
            {hint}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ModelTestInfo;

ModelTestInfo.propTypes = {
  model: PropTypes.string,
  hint: PropTypes.string,
};
