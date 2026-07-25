import { useState } from 'react';
import PropTypes from 'prop-types';

// 沒有底圖時的替代底：中性深灰漸層。
// 不用「預設圖檔」是因為隨便給一張圖會誤導玩家（以為那是劇情場景），
// 中性底色只負責讓白字有對比、版面不塌。
const FALLBACK_BACKGROUND = 'linear-gradient(160deg, #3a3a3a 0%, #202020 100%)';

function BackgroundLayer({ src, opacity = '0.5' }) {
  const [failed, setFailed] = useState(false);

  // 欄位是空的，或圖片網址載不起來（即時轉化最常見：貼到的不是圖片直連）
  if (!src || failed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: FALLBACK_BACKGROUND,
          opacity: opacity,
        }}
      ></div>
    );
  }

  return (
    <img
      src={src}
      onError={() => setFailed(true)}
      style={{
        objectFit: 'cover',
        objectPosition: '35%',
        width: '100%',
        height: '100%',
        opacity: opacity,
      }}
    ></img>
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
