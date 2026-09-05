import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
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

  // fillHeight 模式用量到的高度回推寬度（理由見下面外框的註解）。
  // 高度不依賴寬度（外層 Paper 是固定高度），所以這裡沒有循環。
  const boxRef = useRef(null);
  const [box, setBox] = useState({ h: 0, maxW: 0 });
  useEffect(() => {
    if (!fillHeight) return undefined;
    const el = boxRef.current;
    if (!el) return undefined;
    // 可用寬度取「Paper 的外層」——Paper 自己是 shrink-to-fit（寬度由我們決定），
    // 拿它當上限會變成循環。fillHeight 只有 ImgModel 在用，那一層是固定的 76%。
    const outer = el.parentElement?.parentElement;
    const measure = () =>
      setBox({
        h: el.getBoundingClientRect().height,
        maxW: outer?.clientWidth || 0,
      });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (outer) ro.observe(outer);
    return () => ro.disconnect();
  }, [fillHeight]);

  const fixedWidth =
    fillHeight && box.h
      ? Math.min(box.h * ratio, box.maxW || Number.POSITIVE_INFINITY)
      : null;

  return (
    <Box
      ref={boxRef}
      sx={{
        position: 'relative',
        // 兩種模式都由**外框**決定版面，圖片絕對定位疊上去——骨架才有位子可以佔。
        // 差別只在外框的寬度從哪來：
        //
        //   一般（道具／故事／提示的清單）：寬度來自外層，高度用長寬比算。
        //   fillHeight（ImgModel）：高度來自外層，**寬度用量到的高度乘以比例**。
        //
        // fillHeight 為什麼是量的，不是算的：
        //   ① 一度寫 `width: '100%'`，在 ImgModel 會塌成 0 寬——它的容器是
        //      `alignItems: 'center'`，flex 子項不會被拉滿，於是 Paper 的寬度只能由
        //      內容決定，而內容又反過來要求「父層的 100%」。循環的百分比寬度在 CSS
        //      裡的答案就是 0，圖片變成畫面上一條線。
        //   ② 改成 `aspect-ratio` ＋ `width: auto` 之後 Chrome 好了，**Safari 還是
        //      一條線**——被拉伸的 flex 子項上，Safari 不用長寬比回推寬度。
        //   ③ 改成讓 <img> 自己撐，兩邊都對了，但**版面要等圖載進來才成形**，
        //      於是放大鈕會先在一個位置再跳到另一個（Dong 在 iOS 上回報）。
        //   ⇒ 量出來的 px 沒有這三個問題：每個瀏覽器都認，而且圖還沒到就已經定位。
        ...(fillHeight
          ? { height: '100%', width: fixedWidth ? `${fixedWidth}px` : 'auto' }
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
          // 版面由外框決定，圖片疊上去。還沒量到高度的那一瞬間退回「讓圖自己撐」，
          // 免得外框 0 寬什麼都看不到。
          ...(fillHeight && !fixedWidth
            ? { display: 'block', height: '100%', width: 'auto' }
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
