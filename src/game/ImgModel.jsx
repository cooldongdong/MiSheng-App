import { useState, useContext } from 'react';
import { GameContext } from '../store/game-context';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import ZoomableImage from '../component/common/ZoomableImage';
import NextButton from '../component/common/NextButton';

const Img = ({ currentRow, onNext, canProceed, hideContent = false }) => {
  const [fullScreenIndex, setFullScreenIndex] = useState(null);
  const { getImg } = useContext(GameContext);

  return (
    <Box
      sx={{
        borderRadius: '20px',
        height: 'calc(60dvh + 100px)',
        width: '76%',
        m: 'auto',
        boxSizing: 'border-box',
        position: 'relative',
        // border: '1px solid red',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* hideContent 見 TalkModel 檔頭。這一種沒有底圖層，圖本身就是謎面，
          所以預覽時整個留白——那也正好跟真正那一頁的底是同一個顏色 */}
      {!hideContent && currentRow?.backgroundImg && (
        <ZoomableImage
          src={getImg(currentRow.backgroundImg)}
          alt={`${currentRow.backgroundImg}`}
          borderRadius={'20px'}
          zoomInFab={'center'}
          isFullScreen={fullScreenIndex !== null}
          showZoomButton={fullScreenIndex === null}
          onToggle={() =>
            setFullScreenIndex(fullScreenIndex === null ? 0 : null)
          }
        />
      )}

      {!hideContent && canProceed && (
        <NextButton onClick={onNext} disabled={!canProceed}>
          Next
        </NextButton>
      )}
    </Box>
  );
};

// 定義 propTypes
Img.propTypes = {
  hideContent: PropTypes.bool,
  currentRow: PropTypes.object.isRequired,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default Img;
