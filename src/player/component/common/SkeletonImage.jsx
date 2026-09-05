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
        // 兩種模式的排版方式**不一樣**，因為被給定的那一邊不一樣：
        //
        //   一般（道具／故事／提示的清單）：寬度來自外層，高度用長寬比算，
        //     圖片絕對定位疊在上面 —— 骨架能在載入前就佔好位子。
        //
        //   fillHeight（ImgModel）：高度來自外層，**寬度讓 <img> 自己撐**。
        //
        // fillHeight 為什麼不用長寬比：
        //   ① 原本寫 `width: '100%'`，在 ImgModel 會塌成 0 寬——它的容器是
        //      `alignItems: 'center'`，flex 子項不會被拉滿，於是 Paper 的寬度只能由
        //      內容決定，而內容又反過來要求「父層的 100%」。循環的百分比寬度在 CSS
        //      裡的答案就是 0，圖片變成畫面上一條線。
        //   ② 改成 `aspect-ratio` ＋ `width: auto` 之後 Chrome 好了，**Safari 還是
        //      一條線**（Dong 2026-09-05 回報）——被拉伸的 flex 子項上，Safari 不會
        //      用長寬比回推寬度。
        //   ⇒ 所以這裡改用「高度固定的替換元素，寬度自然由原圖比例決定」這條**從以前
        //     就每個瀏覽器都認**的老路。代價是這個模式在載入前沒有佔位（外框寬度是 0，
        //     骨架跟著看不見），換到的是它真的顯示得出來。
        ...(fillHeight
          // **不要 display:flex**：flex 子項的 width:auto 是「照內容算」，替換元素的
          // 內容寬度是原圖的 1080px，不是「高度 × 比例」，於是又量錯。普通的 block
          // 外框才會讓 <img> 走「高度固定 → 寬度照原圖比例」那條老路。
          ? { height: '100%', width: 'auto', maxWidth: '100%' }
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
          // fillHeight：留在正常流裡，讓它自己的原始比例決定外框有多寬（見上面）。
          // 一般模式：絕對定位，版面完全由外框的長寬比決定。
          ...(fillHeight
            ? {
                display: 'block',
                height: '100%',
                width: 'auto',
                maxWidth: '100%',
              }
            : { position: 'absolute', inset: 0, width: '100%', height: '100%' }),
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
