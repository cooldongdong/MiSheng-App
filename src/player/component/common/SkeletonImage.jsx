import PropTypes from 'prop-types';
import { Box, Skeleton } from '@mui/material';
import {
  useImageRatio,
  useReduceMotion,
  stillSkeletonSx,
} from '../../hook/useImageRatio';

// 一張會先佔好位子的圖。
//
// **解的是「版面會跳」，不是「沒有轉圈」**（2026-09-03）。原本各處都是裸的 `<img>`，
// 沒有寬高、外層也沒有保留高度，於是圖沒載完時卡片是**塌的**、載完瞬間撐開，
// 底下的東西整排被推下去。道具頁一關好幾張圖，這個推擠會連續發生好幾次。
//
// 難處是**長寬比要載完才知道**，所以第一次只能猜（DEFAULT_RATIO），
// onLoad 之後把真正的比例記進 localStorage（見 imgRatio），之後每一次都是準的。
// 玩家會反覆進出道具頁、反覆放大同一張圖，所以第二次之後的命中率很高。
//
// 抽成共用元件是因為 ZoomableImage 與 Wheel 各有一份一模一樣的縮圖，
// 兩邊分開寫的話行為遲早會分岔。

const SkeletonImage = ({
  src,
  alt,
  fillHeight = false, // 高度來自外層（ImgModel），寬度改由長寬比算
  style,
  ...imgProps
}) => {
  const { ref, loaded, ratio, onLoad, onError } = useImageRatio(src);
  const reduceMotion = useReduceMotion();

  return (
    <Box
      sx={{
        position: 'relative',
        // 兩種模式都吃長寬比，差別只在「哪一邊是被給定的」：
        //   一般：寬度來自外層（清單是滿版的），高度由比例算
        //   fillHeight：高度來自外層的固定高度，**寬度由比例算**
        //
        // fillHeight 原本是 `width: '100%'` ＋ 不給比例，那在 ImgModel 會塌成 0 寬——
        // 它的容器是 `alignItems: 'center'`，flex 子項不會被拉滿，於是 Paper 的寬度
        // 只能由內容決定，而內容又反過來要求「父層的 100%」。循環的百分比寬度在 CSS
        // 裡的答案就是 0，圖片變成畫面上一條線（2026-09-05 Dong 回報）。
        //
        // fillHeight 一定要夾 maxWidth：還沒量到比例時用的是 DEFAULT_RATIO（4/3，
        // 橫的），而這個容器是直的——照比例算會得到比框還寬的佔位，載入前那一瞬間
        // 整張圖會凸出去。圖本身是 objectFit: scale-down，夾住不會讓它變形。
        ...(fillHeight
          ? {
              height: '100%',
              width: 'auto',
              maxWidth: '100%',
              aspectRatio: String(ratio),
            }
          : { width: '100%', aspectRatio: String(ratio) }),
        borderRadius: 'inherit',
        overflow: 'hidden',
        ...stillSkeletonSx(reduceMotion),
      }}
    >
      {!loaded && (
        <Skeleton
          variant="rectangular"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      )}
      <img
        ref={ref}
        src={src}
        alt={alt}
        onLoad={onLoad}
        onError={onError}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'scale-down',
          borderRadius: 'inherit',
          opacity: loaded ? 1 : 0,
          transition: reduceMotion ? 'none' : 'opacity 240ms ease',
          ...style,
        }}
        {...imgProps}
      />
    </Box>
  );
};

SkeletonImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  fillHeight: PropTypes.bool,
  style: PropTypes.object,
};

export default SkeletonImage;
