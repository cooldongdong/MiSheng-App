import PropTypes from 'prop-types';
import { useContext, useEffect, useLayoutEffect } from 'react';
import { Box, Fab, Paper } from '@mui/material';
import { GameContext } from '../../store/game-context';
import { usePhotoGestures } from '../../hook/usePhotoGestures';
import { chromeMotionSx, useChromeHidden } from '../../hook/useChromeMotion';
import { NAV_HEIGHT } from './layout';
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

  // 全螢幕時的介面看不看得見。**點畫面一下就切換**——圖片本身就是謎面，任何常駐的
  // 按鈕都可能蓋到關鍵的那一角，要能一鍵收乾淨（iPhone 相簿同一套）。
  // 狀態放在 provider：要一起消失的還有左上的品牌標與右上那排按鈕，它們在別的元件樹。
  // 每次重新放大都回到「看得見」：唯一的出口不可以藏在一個要先發現的手勢後面。
  const {
    openOverlay,
    closeOverlay,
    setOverlayChromeVisible: setChromeVisible,
  } = useContext(GameContext);
  const { chromeHidden } = useChromeHidden();
  useEffect(() => {
    if (isFullScreen) setChromeVisible?.(true);
  }, [isFullScreen, setChromeVisible]);
  // **useLayoutEffect 不是 useEffect。** 用後者的順序是「先畫出放大的背景 → 下一輪
  // 才把導覽列收掉」，中間隔了一次繪製，導覽列就會在背景上被看到一格
  //（Dong 2026-09-05 在 Android 回報「導覽列還是慢了一點消失」）。
  // useLayoutEffect 在瀏覽器繪製前跑完，兩件事落在同一格。
  useLayoutEffect(() => {
    if (!isFullScreen) return undefined;
    openOverlay?.();
    return () => closeOverlay?.();
  }, [isFullScreen, openOverlay, closeOverlay]);

  // 全螢幕看圖的手勢：雙指縮放、雙擊放大、放大後平移、未放大時下滑關閉、單擊收介面
  const { ref: imgRef, transform, dy, dragging, reset, handlers } =
    usePhotoGestures({
      onDismiss: onToggle,
      onTap: () => setChromeVisible?.((v) => !v),
    });

  // 每次重新放大都從 1 倍開始。留著上一次的縮放，下次打開會是一張看不懂的局部。
  useEffect(() => {
    if (isFullScreen) reset();
  }, [isFullScreen, reset]);

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
                // **translateZ(0) 是給 iOS 的**（Dong 2026-09-05 回報：放大鈕會先被
                // 圖蓋過、然後才蓋過圖）。底下那張圖有 opacity 過場，WebKit 會把它
                // 提成合成層；這一層沒有被提，於是在圖層安定之前 z-index 不算數，
                // 它就被畫在圖下面。兩邊都是合成層，先後才穩定。
                // 同一種病的另一個病灶見 GradientLayer。
                transform: 'translateZ(0)',
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
        <Box
          data-no-swipe
          sx={{
            // **這一層是「舞台」，而且會裁切。**
            //
            // 自己接管縮放之後，放大的圖會超出原本的框——玩家端只是超出畫面看不到，
            // 但 /create 的預覽只是三欄裡的中間那一欄，圖就整個蓋到左欄與流程圖上
            //（Dong 2026-09-05 附圖）。所以要有一個會裁的容器。
            //
            // 裡面三個東西改成 absolute（原本各自 fixed）：overflow:hidden 裁不到
            // position:fixed 的子孫，除非裁切的那一層剛好是它們的定位基準。改成
            // absolute 就沒有這個但書了。
            //
            // 100vw/100vh 會量到「視窗」，嵌在 /create 的欄位裡時會溢出去；
            // fixed ＋ inset:0 才是填滿定位基準（見 GameShell #main-container 的 transform）。
            //
            // data-no-swipe 掛在這一層就夠：useSwipeFlow 是用 closest() 往上找的。
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            // **往下多蓋一條導覽列。** /create 的舞台只有預覽欄（導覽列坐在欄位
            // 下方那 56px），導覽列收起來之後那一條會變成空白（Dong 2026-09-05）。
            // 玩家端多出來的部分落在視窗外，看不到也不影響。
            bottom: -NAV_HEIGHT,
            m: '0 !important',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* 背景，點擊可縮小。
              **不透明**：一度是 0.9，於是底下那一頁的介面會隱約透出來——平常被圖片
              蓋住看不到，但往下拖曳時上緣露出來，NEXT 鈕就浮在那裡（Dong 附圖）。
              看謎面的時候不該看到別的東西。 */}
          <Box
            onClick={onToggle}
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgb(200, 200, 200)',
            }}
          />

          {/* 放大的圖片。
              不疊骨架：要點放大就一定先看過縮圖，瀏覽器已經有快取、比例也記過了，
              疊上去只會閃一下。 */}
          <img
            src={src}
            alt={alt}
            ref={imgRef}
            {...handlers}
            style={{
              width: '100%',
              maxWidth: '600px',
              maxHeight: '100%',
              position: 'absolute',
              top: '50%',
              left: '50%',
              margin: 0,
              // 縮放／平移（我們自己算的）＋ 下滑關閉的位移。
              // 下滑時順便縮小一點——那是「它要離開了」的回饋，沒有的話看起來像卡住。
              transform: `translate(-50%, -50%) translate(${transform.x}px, ${
                transform.y + dy
              }px) scale(${transform.scale * (1 - Math.min(dy / 1600, 0.1))})`,
              // 拖曳中不要過場，否則跟手會有延遲；放開才要，那是彈回去的動畫
              transition: dragging ? 'none' : 'transform 220ms ease',
              // **全部的觸控都歸我們**。交給瀏覽器的話它縮放的是整個頁面，
              // 左上角的品牌標與右上角那排按鈕會跟著一起變大（Dong 2026-09-05 回報）。
              touchAction: 'none',
              objectFit: 'scale-down',
              zIndex: 1,
            }}
          />

          {/* 縮小鈕留在**下方正中**，不搬去右上角——實境解謎是單手在戶外玩的，
              右上角是拇指最難搆到的位置之一（Dong 2026-09-05）。它會蓋到圖片底部的
              問題，改用「點一下收起介面」解決，不用搬家。
              動作樣式下在 Fab 自己身上：外框只要有 transform 就會變成定位基準。 */}
          <Fab
            onClick={onToggle}
            sx={{
              ...chromeMotionSx(chromeHidden, {
                from: 'bottom',
                base: 'translateX(-50%)',
              }),
              position: 'absolute',
              bottom: 20,
              left: '50%',
              zIndex: 2, // 在圖片之上
              backgroundColor: '#fff',
              color: '#37474F',
            }}
          >
            <CloseFullscreenRoundedIcon />
          </Fab>
        </Box>
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
