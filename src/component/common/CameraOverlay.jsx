import PropTypes from 'prop-types';
import { useContext, useRef, useState } from 'react';
import { Box, Fab, Slider, Typography } from '@mui/material';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpacityRoundedIcon from '@mui/icons-material/OpacityRounded';
import { GameContext } from '../../store/game-context';
import ZoomableImage from './ZoomableImage';
import { useCameraStream, CAMERA_STATUS } from '../../hook/useCameraStream';
import { useOverlayGestures } from '../../hook/useOverlayGestures';

// prop.type = 'Camera'：數位透明片。
// 打開後鏡頭，把 prop.img 半透明疊在即時畫面上，玩家把手機舉到現實物件上對位。
// 實體透明片疊實體卡片本來就比手機好用——這個道具唯一不可替代的場合，是疊在
// 「帶不走的現場物件」上（匾額、壁畫、地磚）。所以它一定要能對得準：
// 拖曳、縮放、旋轉、還有凍結。

// 凍結的是「現實」不是疊圖：手舉著會抖，正確順序是先把現實定住，再慢慢對圖。
// 所以凍結期間疊圖照樣能動，也就不需要另外做一顆疊圖鎖定鈕。

const BLOCKED_MESSAGE = {
  insecure: '這個頁面不是用安全連線（HTTPS）開啟的，瀏覽器不會給相機。',
  denied:
    '沒有拿到相機權限。如果你是從 LINE、Instagram 這類 App 的內建瀏覽器點進來的，請改用 Safari 或 Chrome 開啟這個連結。',
  notfound: '這台裝置上找不到相機。',
  busy: '相機正被其他程式使用中，關掉之後再試一次。',
  other: '相機打不開。',
};

const CameraStage = ({ src, title, onClose }) => {
  const [frozen, setFrozen] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const canvasRef = useRef(null);

  // 凍結＝把當下那一格畫進 canvas，然後把相機整個關掉（不是暫停）。
  // 對位可能一對就是一分鐘，沒必要讓相機燈亮著。解凍時重開，權限已經給過了不會再問。
  const { videoRef, status, reason } = useCameraStream(!frozen);
  const { containerRef, transform, reset, onPointerDown } = useOverlayGestures();

  const blocked = status === CAMERA_STATUS.BLOCKED;

  const freeze = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
    }
    setFrozen(true);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        m: '0 !important', // ContentList 的 Stack spacing 會給每個子元素一個 margin-top
        zIndex: 1200,
        overflow: 'hidden',
        backgroundColor: '#1b2126',
      }}
    >
      {/* 相機畫面（底層）。凍結時換成 canvas 的那一格 */}
      {!blocked && (
        <>
          <video
            ref={videoRef}
            playsInline // iOS 少了它會把影片搶去全螢幕播放
            muted
            autoPlay
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              visibility: frozen ? 'hidden' : 'visible',
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // 解凍後相機要重開一下下，這段期間繼續顯示凍結的那一格，才不會閃黑
              visibility: frozen || status !== CAMERA_STATUS.LIVE ? 'visible' : 'hidden',
            }}
          />
        </>
      )}

      {/* 疊圖層：手勢都掛在這裡。控制列是它的兄弟不是子孫，按鈕才不會被手勢吃掉 */}
      <Box
        ref={containerRef}
        onPointerDown={blocked ? undefined : onPointerDown}
        sx={{
          position: 'absolute',
          inset: 0,
          touchAction: 'none', // 不關掉瀏覽器的捲動／縮放，兩指就永遠輪不到我們
          userSelect: 'none',
        }}
      >
        {src && (
          <img
            src={src}
            alt={title || '透明片'}
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: blocked ? '86%' : '80%',
              maxHeight: blocked ? '70%' : undefined,
              objectFit: 'scale-down',
              opacity: blocked ? 1 : opacity,
              pointerEvents: 'none',
              transform: blocked
                ? 'translate(-50%, -50%)'
                : `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
            }}
          />
        )}
      </Box>

      {/* 標題 */}
      {title && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 0,
            backgroundColor: '#37474F',
            borderRadius: '0px 20px 20px 0px',
            fontSize: 14,
            letterSpacing: 0.7,
            color: '#fff',
            p: '6px',
            pr: '13px',
          }}
        >
          {title}
        </Box>
      )}

      {/* 拿不到相機時：退化成純看圖，並說清楚為什麼、還能怎麼辦。
          這一關不能因為相機失敗就走不下去——出事的當下沒有人在現場能救玩家 */}
      {blocked && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 96,
            left: 16,
            right: 16,
            p: 2,
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            color: '#37474F',
          }}
        >
          <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
            {BLOCKED_MESSAGE[reason] || BLOCKED_MESSAGE.other}
          </Typography>
          <Typography sx={{ fontSize: 14, lineHeight: 1.6, mt: 1, fontWeight: 'bold' }}>
            先看這張圖也可以繼續解謎。
          </Typography>
        </Box>
      )}

      {/* 控制列 */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          pb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          backgroundColor: 'rgba(27, 33, 38, 0.55)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {/* 手機上兩指就會轉，不必說；桌機沒有第二根手指，不講就沒人找得到 Shift。
            用 pointer: fine 判斷輸入裝置，比抓 UA 可靠 */}
        {!blocked && (
          <Typography
            sx={{
              display: 'none',
              '@media (pointer: fine)': { display: 'block' },
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: 12,
              textAlign: 'center',
              letterSpacing: 0.5,
            }}
          >
            拖曳移動 · 滾輪縮放 · Shift ＋ 拖曳旋轉
          </Typography>
        )}

        {!blocked && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
            <OpacityRoundedIcon sx={{ color: '#fff' }} />
            <Slider
              value={opacity}
              onChange={(event, value) => setOpacity(value)}
              min={0.05}
              max={1}
              step={0.01}
              aria-label="透明度"
              sx={{ color: '#fff' }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          {!blocked && (
            <Fab
              size="medium"
              onClick={frozen ? () => setFrozen(false) : freeze}
              aria-label={frozen ? '解凍畫面' : '凍結畫面'}
              sx={{ backgroundColor: '#fff', color: '#37474F' }}
            >
              {frozen ? <PlayArrowRoundedIcon /> : <PauseRoundedIcon />}
            </Fab>
          )}
          {!blocked && (
            <Fab
              size="medium"
              onClick={reset}
              aria-label="重設位置"
              sx={{ backgroundColor: '#fff', color: '#37474F' }}
            >
              <RestartAltRoundedIcon />
            </Fab>
          )}
          <Fab
            size="medium"
            onClick={onClose}
            aria-label="關閉"
            sx={{ backgroundColor: '#fff', color: '#37474F' }}
          >
            <CloseRoundedIcon />
          </Fab>
        </Box>
      </Box>
    </Box>
  );
};

CameraStage.propTypes = {
  src: PropTypes.string,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

const CameraOverlay = ({ prop, isFullScreen, showZoomButton, onToggle }) => {
  const { getImg } = useContext(GameContext);
  const src = getImg(prop.img) || '';

  // 卡片態沿用 ZoomableImage，只把放大鈕換成相機。
  // 相機是點下去才開的——一頁可能好幾個道具，不能一進道具頁就把相機全部打開。
  if (!isFullScreen) {
    return (
      <ZoomableImage
        src={src}
        alt={prop.img}
        title={prop.title}
        isFullScreen={false}
        showZoomButton={showZoomButton}
        onToggle={onToggle}
        openIcon={<PhotoCameraRoundedIcon />}
      />
    );
  }

  return <CameraStage src={src} title={prop.title} onClose={onToggle} />;
};

CameraOverlay.propTypes = {
  prop: PropTypes.object.isRequired,
  isFullScreen: PropTypes.bool.isRequired,
  showZoomButton: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default CameraOverlay;
