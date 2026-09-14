import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Skeleton } from '@mui/material';
import { isReady, useReduceMotion, stillSkeletonSx } from '../../hook/useImageRatio';

// 沒有底圖時的替代底：中性深灰漸層。
// 不用「預設圖檔」是因為隨便給一張圖會誤導玩家（以為那是劇情場景），
// 中性底色只負責讓白字有對比、版面不塌。
const FALLBACK_BACKGROUND = 'linear-gradient(160deg, #3a3a3a 0%, #202020 100%)';

// 2026-09-03 判定「這一層不需要骨架」，理由是滿版圖層的容器先有尺寸、版面不會跳。
// **那個理由今天仍然成立，但它只回答了一半的問題。**
//
// 2026-09-14 Dong 回報 MissionStart 在圖片載入前是一塊深灰，看起來不像在載入。
// 而 9/03 自己就寫過「『載入體驗不好』不是一種病，是至少兩種」——
// 版面跳動是一種，**看不出在載入是另一種**，而這一層當初只處理了前者。
//
// 難的地方在於這塊中性深灰有**雙重身分**：
//   · 沒填底圖的關卡 → 它就是最終樣貌
//   · 有底圖但還在載 → 它是暫時樣貌
// 玩家分不出來，所以「等一下」跟「就是長這樣」看起來一模一樣。
//
// ⇒ 所以骨架**只在第二種情況出現**（`showImg && !loaded`），載完或沒填圖都不會有。
// 它疊在替代底之上、圖片之下，用的是道具頁那一套 MUI Skeleton，
// 視覺語言一致；`prefers-reduced-motion` 時不動（stillSkeletonSx）。
function BackgroundLayer({ src, opacity = '0.5' }) {
  const imgRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduceMotion = useReduceMotion();

  // **換圖要重置。** 沒有這一段的話，某一列的底圖載失敗之後，
  // 後面每一列都會停在替代底——React 在同一個位置重用同一個元件實例，
  // failed 不會自己回到 false。（同一種病的另一個病灶見 CharacterLayer。）
  useEffect(() => {
    setFailed(false);
    // 快取命中時 load 事件可能早在 React 掛上 onLoad 之前就發生完了，
    // 所以要當場問元素一次，否則圖是好的卻永遠停在透明（見 isReady）
    setLoaded(isReady(imgRef.current));
  }, [src]);

  const showImg = Boolean(src) && !failed;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 替代底常駐在最底層：它同時是「沒填圖」「載失敗」「還在載」三種狀態的底 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: FALLBACK_BACKGROUND,
          opacity,
        }}
      />
      {/* 只有「有圖、但還沒載完」才鋪骨架——見檔頭關於雙重身分的說明。
          透明度壓得比一般骨架低，因為它疊在深色底上，太亮會蓋掉那塊設計過的中性底。 */}
      {showImg && !loaded && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            ...stillSkeletonSx(reduceMotion),
          }}
        >
          <Skeleton
            variant="rectangular"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              bgcolor: 'rgba(255, 255, 255, 0.07)',
            }}
          />
        </Box>
      )}
      {showImg && (
        <img
          ref={imgRef}
          src={src}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            objectFit: 'cover',
            objectPosition: '35%',
            width: '100%',
            height: '100%',
            opacity: loaded ? opacity : 0,
            transition: reduceMotion ? 'none' : 'opacity 320ms ease',
          }}
        />
      )}
    </div>
  );
}

BackgroundLayer.propTypes = {
  src: PropTypes.string,
  opacity: PropTypes.oneOfType([
    PropTypes.string, // opacity 可以是字串
    PropTypes.number, // 或數字
  ]),
};

export default BackgroundLayer;
