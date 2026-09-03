import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { isReady, useReduceMotion } from '../../hook/useImageRatio';

// 沒有底圖時的替代底：中性深灰漸層。
// 不用「預設圖檔」是因為隨便給一張圖會誤導玩家（以為那是劇情場景），
// 中性底色只負責讓白字有對比、版面不塌。
const FALLBACK_BACKGROUND = 'linear-gradient(160deg, #3a3a3a 0%, #202020 100%)';

// **這一層不需要骨架**（2026-09-03 討論）。道具頁的圖會讓卡片先塌再撐開，
// 是因為那是卡片、高度由圖片決定；這裡是滿版圖層，容器（Layer）先有尺寸、
// 圖再填進去，所以從頭到尾不會跳。而且對白文字在圖還沒到之前就讀得到——
// 在它底下鋪一塊會呼吸的灰色矩形只會跟內容搶注意力。
//
// 這裡缺的是**淡入**：原本是從漸層瞬間切換成圖片。漸層改成常駐的底層、
// 圖片疊在上面淡入，載入中看到的就是那個本來就設計過的中性底。
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
