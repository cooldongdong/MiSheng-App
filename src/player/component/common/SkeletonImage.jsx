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
  fillHeight = false, // 外層已經給了固定高度（ImgModel），這時不要再用長寬比撐
  style,
  ...imgProps
}) => {
  const { ref, loaded, ratio, onLoad, onError } = useImageRatio(src);
  const reduceMotion = useReduceMotion();

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        ...(fillHeight ? { height: '100%' } : { aspectRatio: String(ratio) }),
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
