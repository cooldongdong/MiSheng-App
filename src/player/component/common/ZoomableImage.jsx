import PropTypes from 'prop-types';
import { useContext, useEffect, useState } from 'react';
import { Box, Fab, Paper } from '@mui/material';
import { GameContext } from '../../store/game-context';
import { useDismissDrag } from '../../hook/useDismissDrag';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded';
import SkeletonImage from './SkeletonImage';

// 道具、故事、提示、Camera、全文對話框、ImgModel 的圖都走這裡。
//
// **但不是「遊戲裡唯一的圖片入口」**——Wheel 自己畫四層圖（量尺／底圖／兩層旋轉／
// 前景），沒有經過這個檔。2026-09-03 第一版就是漏了它，Dong 回報「wheel 道具的
// Skeleton 好像沒做到」。所以佔位的邏輯抽到 SkeletonImage，兩邊共用。
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
  // ImgModel（zoomInFab='center'）的 Paper 是固定高度的，
  // 所以佔位改成「高度吃滿、寬度由長寬比算」（見 SkeletonImage）。
  const fixedHeight = zoomInFab === 'center';

  // 全螢幕時的介面（縮小鈕）看不看得見。**點畫面一下就切換**——圖片本身就是謎面，
  // 任何常駐的按鈕都可能蓋到關鍵的那一角，要能一鍵收乾淨（iPhone 相簿同一套）。
  // 每次重新放大都回到「看得見」：唯一的出口不可以藏在一個要先發現的手勢後面。
  const [chromeVisible, setChromeVisible] = useState(true);
  useEffect(() => {
    if (isFullScreen) setChromeVisible(true);
  }, [isFullScreen]);

  // 讓 GameShell 把底部導覽列收起來（避免玩家想關圖卻誤按分頁）。
  // 只能用「不要畫」，不能調 z-index——見 game-provider 的 overlayCount 註解。
  const { openOverlay, closeOverlay } = useContext(GameContext);
  useEffect(() => {
    if (!isFullScreen) return undefined;
    openOverlay?.();
    return () => closeOverlay?.();
  }, [isFullScreen, openOverlay, closeOverlay]);

  // 往下滑關閉；沒過門檻就彈回去
  const { dy, dragging, handlers } = useDismissDrag({
    onDismiss: onToggle,
    onTap: () => setChromeVisible((v) => !v),
  });

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
          {/* 佔位、記比例、淡入都在 SkeletonImage 裡（Wheel 的縮圖用同一個） */}
          <SkeletonImage src={src} alt={alt} fillHeight={fixedHeight} />
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
              // 拉得愈遠背景愈透，讓「正在離開」這件事在放開之前就看得出來
              opacity: 1 - Math.min(dy / 260, 0.55),
              transition: dragging ? 'none' : 'opacity 220ms ease',
              zIndex: 1000,
            }}
          />

          {/* 放大的圖片 */}
          {/* 放大這一份不疊骨架：要點放大就一定先看過縮圖，瀏覽器已經有快取、
              比例也在那一次記過了，疊上去只會閃一下。 */}
          <img
            data-no-swipe
            src={src}
            alt={alt}
            {...handlers}
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '100%',
              position: 'fixed',
              top: '50%',
              left: '50%',
              margin: 0,
              // 跟著手指走，並且愈拉愈小一點——那個縮小是「它要離開了」的回饋，
              // 沒有的話拖曳看起來像卡住。
              transform: `translate(-50%, -50%) translateY(${dy}px) scale(${
                1 - Math.min(dy / 1600, 0.1)
              })`,
              // 拖曳中不要過場，否則跟手會有延遲；放開才要，那是彈回去的動畫
              transition: dragging ? 'none' : 'transform 220ms ease',
              // 單指是我們的（拖曳關閉），雙指留給瀏覽器縮放——index.html 的 viewport
              // 沒有鎖 user-scalable，玩家本來就能放大看謎面的細節，不該被吃掉
              touchAction: 'pinch-zoom',
              objectFit: 'scale-down',
              zIndex: 1101, // 確保圖片在最上層
            }}
          />

          {/* 縮小按鈕 */}
          {/* 縮小鈕留在**下方正中**，不搬去右上角——實境解謎是單手在戶外玩的，
              右上角是拇指最難搆到的位置之一（Dong 2026-09-05）。它會蓋到圖片
              底部的問題，改用「點一下收起介面」解決，不用搬家。
              全螢幕時導覽列已經收起來了，所以這裡可以回到 bottom:20。 */}
          {chromeVisible && (
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
          )}
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
