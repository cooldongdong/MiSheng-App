import PropTypes from 'prop-types';
import { Box, Fab, Paper } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded';

const ZoomableImage = ({
  src,
  alt,
  title,
  elevation = 10,
  borderRadius = '10px',
  zoomInFab = 'right',
  isFullScreen,
  showZoomButton,
  onToggle,
  openIcon, // 給 Camera 道具換成相機圖示；不給就是原本的放大
}) => {
  return (
    <>
      {/* 當圖片沒有放大時，顯示在 Paper 內 */}
      {!isFullScreen && (
        <Paper
          elevation={elevation}
          sx={{
            display: 'flex',
            borderRadius: { borderRadius },
            position: 'relative',
            // ImgModel 選項
            height: zoomInFab === 'center' ? '86%' : null,
          }}
        >
          {showZoomButton && (
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                bottom: 10,
                display: 'flex',
                alignItems: 'center',
                zIndex: 1101,
              }}
            >
              {title && (
                <Box
                  sx={{
                    backgroundColor: '#37474F',
                    borderRadius: '0px 20px 20px 0px',
                    fontSize: 14,
                    fontWeight: 'regular',
                    textAlign: 'center',
                    letterSpacing: 0.7,
                    color: '#fff',
                    p: '6px',
                    pr: '13px',
                  }}
                >
                  {title}
                </Box>
              )}
              {zoomInFab === 'right' && (
                <Fab
                  size="small"
                  onClick={onToggle}
                  sx={{
                    backgroundColor: '#fff',
                    color: '#37474F',
                    right: 10,
                    ml: 'auto',
                  }}
                >
                  {openIcon || <OpenInFullRoundedIcon />}
                </Fab>
              )}
              {zoomInFab === 'center' && (
                <Fab
                  size="medium"
                  onClick={onToggle}
                  sx={{
                    backgroundColor: '#fff',
                    color: '#37474F',
                    m: 'auto',
                    top: 10,
                    transform: 'translateY(50%)',
                  }}
                >
                  {openIcon || <OpenInFullRoundedIcon />}
                </Fab>
              )}
            </Box>
          )}
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              objectFit: 'scale-down',
              borderRadius: 'inherit',
            }}
          />
        </Paper>
      )}

      {/* 當圖片放大時 */}
      {isFullScreen && (
        <>
          {/* 半透明背景，點擊可縮小。
              data-no-swipe：放大的圖蓋滿整個遊戲區，這時上下滑該是「看圖」而不是
              翻頁——玩家端的滑動手勢（useSwipeFlow）看到這個標記就整個不接手。 */}
          <Box
            data-no-swipe
            onClick={onToggle}
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              m: '0 !important',
              // 100vw/100vh 會量到「視窗」，嵌在 /create 的欄位裡時會溢出去；
              // 100% 才是填滿定位基準（見 GameShell #main-container 的 transform）
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(200, 200, 200, 0.9)',
              zIndex: 1000,
            }}
          />

          {/* 放大的圖片 */}
          <img
            data-no-swipe
            src={src}
            alt={alt}
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '100%',
              position: 'fixed',
              top: '50%',
              left: '50%',
              margin: 0,
              transform: 'translate(-50%, -50%)',
              objectFit: 'scale-down',
              zIndex: 1101, // 確保圖片在最上層
            }}
          />

          {/* 縮小按鈕 */}
          <Fab
            data-no-swipe
            onClick={onToggle}
            sx={{
              position: 'fixed',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1102, // 確保按鈕在圖片之上
              backgroundColor: '#fff',
              color: '#37474F',
            }}
          >
            <CloseFullscreenRoundedIcon />
          </Fab>
        </>
      )}
    </>
  );
};

ZoomableImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  title: PropTypes.string,
  elevation: PropTypes.number,
  borderRadius: PropTypes.string,
  zoomInFab: PropTypes.string,
  isFullScreen: PropTypes.bool.isRequired,
  showZoomButton: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  openIcon: PropTypes.node,
};

export default ZoomableImage;
