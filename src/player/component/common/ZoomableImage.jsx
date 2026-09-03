import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Fab, Paper, Skeleton, useMediaQuery } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded';
import { DEFAULT_RATIO, readRatio, rememberRatio } from '../../game/imgRatio';

// 這是遊戲裡**唯一**的圖片入口——道具、故事、提示、Camera、全文對話框、ImgModel
// 全部走這裡。所以載入時的行為只要在這個檔修好，四個地方一起好。
//
// **2026-09-03：改成骨架佔位。** 原本是一個裸的 `<img>`，沒有寬高、外層 Paper 也沒有
// 保留高度，於是圖沒載完時整張卡片是**塌的**、載完瞬間撐開，底下的東西整排被推下去
// （道具頁一關好幾張圖，這個推擠會連續發生好幾次）。Dong 回報「道具載入時的效果不好」
// 指的就是這個——問題不是「沒有轉圈」，是版面會跳。
//
// 難處是**長寬比要載完才知道**，所以第一次只能猜。作法是 imgRatio：第一次用預設比例，
// 載完把真正的比例記進 localStorage，之後每一次都是準的。玩家會反覆進出道具頁、
// 反覆放大同一張圖，所以第二次之後的命中率很高。

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
  const [loaded, setLoaded] = useState(false);
  const [ratio, setRatio] = useState(() => readRatio(src) ?? DEFAULT_RATIO);
  // 會動的東西對某些人是負擔，系統設定說不要動就不要動。
  // **pulse 掛在元素本身、wave 才掛在 ::after**，兩個選擇器都要關，只關一個等於沒關。
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // 換圖就重來一輪。同一個元件會被重複使用（換關、換道具），
  // 沒有這一段的話新圖會沿用上一張的 loaded=true，骨架整個失效。
  useEffect(() => {
    setLoaded(false);
    setRatio(readRatio(src) ?? DEFAULT_RATIO);
  }, [src]);

  const handleLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w > 0 && h > 0) {
      setRatio(w / h);
      rememberRatio(src, w / h);
    }
    setLoaded(true);
  };

  // 圖掛掉時也要放行，否則骨架會永遠停在那裡——
  // 一個永遠不會結束的載入動畫比一張破圖更難懂。
  const handleError = () => setLoaded(true);

  // ImgModel（zoomInFab='center'）的 Paper 是固定高度的，
  // 這時不能再用長寬比撐開，讓佔位直接填滿那個高度就好。
  const fixedHeight = zoomInFab === 'center';

  const fadeSx = {
    opacity: loaded ? 1 : 0,
    transition: reduceMotion ? 'none' : 'opacity 240ms ease',
  };

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
          {/* 保留高度的容器：載入中由骨架填滿，載完換成圖，兩者尺寸一致所以不會跳。
              第一次看這張圖時 ratio 是猜的（DEFAULT_RATIO），onLoad 之後換成真的
              ——**那一下還是會跳，但只會發生在這台裝置從沒看過的圖的第一眼**，
              而且幅度遠小於現在「整張卡片從塌的撐開」。 */}
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              ...(fixedHeight ? { height: '100%' } : { aspectRatio: String(ratio) }),
              borderRadius: 'inherit',
              overflow: 'hidden',
              ...(reduceMotion
                ? {
                    '& .MuiSkeleton-root, & .MuiSkeleton-root::after': {
                      animation: 'none',
                    },
                  }
                : null),
            }}
          >
            {!loaded && (
              <Skeleton
                variant="rectangular"
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
            )}
            <img
              src={src}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'scale-down',
                borderRadius: 'inherit',
                ...fadeSx,
              }}
            />
          </Box>
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
          {/* 放大這一份不疊骨架：要點放大就一定先看過縮圖，瀏覽器已經有快取，
              疊上去只會閃一下。但 onLoad 還是要掛——有些入口（ImgModel）可能
              直接以放大狀態掛載，那時這裡是第一次量到比例的地方。 */}
          <img
            data-no-swipe
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
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
