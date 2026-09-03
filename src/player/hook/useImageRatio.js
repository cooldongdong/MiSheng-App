import { useEffect, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { DEFAULT_RATIO, readRatio, rememberRatio } from "../game/imgRatio";

// 圖片佔位用的共用狀態。放在 hook 而不是跟 SkeletonImage 同檔，是因為
// **同一個檔同時匯出元件與非元件會讓 fast refresh 失效**（eslint 會警告）；
// 而 Wheel 的四層圖沒辦法直接用 SkeletonImage，只能用這幾個 hook 自己組。

/** 一張圖的載入狀態與長寬比。比例第一次是猜的，載完換成真的並記起來。 */
export const useImageRatio = (src) => {
  const [loaded, setLoaded] = useState(false);
  // loaded 與 measured 不是同一件事：**圖掛掉時 loaded 也要是 true**（否則骨架
  // 永遠不會結束），但那時候我們並沒有量到任何尺寸。呼叫端若拿「載完了」當成
  // 「可以把版面交還給圖片」，遇到壞圖就會先撐開再塌掉——比不佔位更難看。
  const [measured, setMeasured] = useState(false);
  const [ratio, setRatio] = useState(() => readRatio(src) ?? DEFAULT_RATIO);

  // 換圖就重來一輪。同一個元件會被重複使用（換關、換道具），
  // 沒有這一段的話新圖會沿用上一張的 loaded=true，佔位整個失效。
  useEffect(() => {
    setLoaded(false);
    setMeasured(false);
    setRatio(readRatio(src) ?? DEFAULT_RATIO);
  }, [src]);

  const onLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w > 0 && h > 0) {
      setRatio(w / h);
      rememberRatio(src, w / h);
      setMeasured(true);
    }
    setLoaded(true);
  };

  // 圖掛掉時也要放行，否則骨架會永遠停在那裡——
  // 一個永遠不會結束的載入動畫比一張破圖更難懂。
  const onError = () => setLoaded(true);

  return { loaded, measured, ratio, onLoad, onError };
};

/** 會動的東西對某些人是負擔，系統設定說不要動就不要動 */
export const useReduceMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

/** **pulse 掛在元素本身、wave 才掛在 ::after**，兩個選擇器都要關，只關一個等於沒關 */
export const stillSkeletonSx = (reduceMotion) =>
  reduceMotion
    ? {
        "& .MuiSkeleton-root, & .MuiSkeleton-root::after": {
          animation: "none",
        },
      }
    : null;
