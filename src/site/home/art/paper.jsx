import PropTypes from 'prop-types';
import { INK } from './palette';

// 剪紙感插畫共用的濾鏡元件：紙纖維、紙與紙之間的陰影。毛邊的幾何在 paperUtils.js。

// 濾鏡：紙纖維（疊在整張圖上）＋層陰影。id 由外面傳入，避免同頁多張圖撞 id
export const PaperDefs = ({ id, shadow = 3 }) => (
  <defs>
    <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy={shadow} stdDeviation={shadow} floodColor={INK.ink} floodOpacity="0.28" />
    </filter>
    <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
      <feColorMatrix
        in="noise"
        type="matrix"
        values="0 0 0 0 0.15  0 0 0 0 0.2  0 0 0 0 0.22  0 0 0 0.09 0"
      />
    </filter>
  </defs>
);
PaperDefs.propTypes = { id: PropTypes.string.isRequired, shadow: PropTypes.number };

// 紙纖維蓋板：放在最上層、不擋滑鼠
export const Grain = ({ id }) => (
  <rect width="360" height="780" filter={`url(#${id}-grain)`} style={{ pointerEvents: 'none' }} />
);
Grain.propTypes = { id: PropTypes.string.isRequired };
