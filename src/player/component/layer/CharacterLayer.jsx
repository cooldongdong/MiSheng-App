import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { isReady, useReduceMotion } from '../../hook/useImageRatio';

// 立繪。沒填、或圖片抓不到就不畫，免得留一個破圖 icon 卡在畫面中央。
//
// **失敗狀態一定要跟著 src 重置**（2026-09-03 修）。原本的寫法是
// `onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}`
// ——直接改 DOM。而 React 在同一個位置會**重用同一個 `<img>` 元素**，只換 src 屬性，
// 那行手寫的 inline style 不會被還原。所以：某一句對白的立繪載失敗，
// 下一句換一個講者、立繪明明是好的，**那個角色也會是隱形的**。
//
// 這跟 useImageRatio 要在換圖時重置 loaded 是同一種病：
// **狀態掛在會被重用的東西上，而沒有人負責清掉它。**
function CharacterLayer({ src }) {
  const imgRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    setFailed(false);
    // 同 BackgroundLayer：快取命中時等不到 load 事件（見 isReady）
    setLoaded(isReady(imgRef.current));
  }, [src]);

  if (!src || failed) return null;

  return (
    <img
      ref={imgRef}
      src={src}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      style={{
        objectFit: 'contain',
        objectPosition: 'top',
        width: '100%',
        height: '100%',
        position: 'relative',
        // 跟背景一樣淡入。立繪是疊在背景上的人物，硬切會很像「彈出來」
        opacity: loaded ? 1 : 0,
        transition: reduceMotion ? 'none' : 'opacity 320ms ease',
      }}
    />
  );
}

CharacterLayer.propTypes = {
  src: PropTypes.string,
};

export default CharacterLayer;
