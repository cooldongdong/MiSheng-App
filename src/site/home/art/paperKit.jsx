import { createContext, useContext, useId } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'motion/react';
import { INK } from './palette';

// 「疊紙」插畫的共用零件。首頁所有插畫都用這一套，所以它們看起來是同一隻手做的：
//   PaperScene  一張畫布：底紙＋濾鏡定義＋最上層的紙纖維
//   Sheet       一片紙：自動在下一層投陰影；可以給它一個漂動的幅度
//
// 為什麼陰影走 context：每張畫布的濾鏡 id 必須唯一（同頁好幾張圖），
// 但畫裡每一片紙都要引用它。一層一層傳 props 會讓每張圖的程式碼被 id 淹沒。

const SceneCtx = createContext(null);

// 紙纖維：用 CSS 背景圖鋪在插畫上面，而不是畫布裡的 feTurbulence 濾鏡。
// 實測：同一段有好幾張會動的插畫時，濾鏡版每一幀都重算雜訊（道具段落約 52fps）；
// 背景圖只柵格化一次、之後重複貼，看起來一樣。
const NOISE = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7'/><feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.2  0 0 0 0 0.22  0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"
).replace(/%2523/g, '%23');
const WRAP = { position: 'relative', display: 'block', width: '100%', height: '100%' };
const GRAIN = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage: `url("data:image/svg+xml,${NOISE}")`,
};

// fit：top＝鋪滿、靠上對齊（手機立繪，主體在上半）；cover＝鋪滿、置中；contain＝整張放得進去
const FIT = { top: 'xMidYMin slice', cover: 'xMidYMid slice', contain: 'xMidYMid meet' };

export const PaperScene = ({ width = 360, height = 780, bg = INK.paperDeep, shadow = 3, fit = 'top', children }) => {
  // useId 會給 ":r1:" 這種字串；冒號放進 url(#...) 會讓瀏覽器找不到濾鏡
  const id = `pp${useId().replace(/:/g, '')}`;
  return (
    <span style={WRAP}>
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={FIT[fit]}
      width="100%"
      height="100%"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <filter id={`${id}-s`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={shadow} stdDeviation={shadow} floodColor={INK.ink} floodOpacity="0.28" />
        </filter>
      </defs>
      {/* 底紙與紙纖維往外多鋪一圈：cover 裁切時畫布外面也看得到，不能露出沒有紙的邊 */}
      {bg && <rect x={-width} y={-height} width={width * 3} height={height * 3} fill={bg} />}
      <SceneCtx.Provider value={`url(#${id}-s)`}>{children}</SceneCtx.Provider>
    </svg>
    {/* 沒有底紙就不疊紙纖維：只會在頁面上留下一塊淡灰的方塊 */}
    {bg && <span style={GRAIN} />}
    </span>
  );
};
PaperScene.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  bg: PropTypes.string,
  shadow: PropTypes.number,
  fit: PropTypes.oneOf(Object.keys(FIT)),
  children: PropTypes.node,
};

// 一片紙。drift＝左右漂的幅度（0 不動），越前面的層幅度越大，就有景深
export const Sheet = ({ drift = 0, duration = 9, flat = false, children, ...rest }) => {
  const shadow = useContext(SceneCtx);
  const motionProps = drift
    ? {
        animate: { x: [0, drift, 0, -drift, 0] },
        transition: { duration, repeat: Infinity, ease: 'easeInOut' },
      }
    : {};
  return (
    <motion.g filter={flat ? undefined : shadow} {...motionProps} {...rest}>
      {children}
    </motion.g>
  );
};
Sheet.propTypes = {
  drift: PropTypes.number,
  duration: PropTypes.number,
  flat: PropTypes.bool,
  children: PropTypes.node,
};
