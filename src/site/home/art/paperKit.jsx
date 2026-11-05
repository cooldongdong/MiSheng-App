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

export const PaperScene = ({ width = 360, height = 780, bg = INK.paperDeep, shadow = 3, slice = true, children }) => {
  // useId 會給 ":r1:" 這種字串；冒號放進 url(#...) 會讓瀏覽器找不到濾鏡
  const id = `pp${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={slice ? 'xMidYMin slice' : 'xMidYMid meet'}
      width="100%"
      height="100%"
      aria-hidden
      style={{ display: 'block' }}
    >
      <defs>
        <filter id={`${id}-s`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy={shadow} stdDeviation={shadow} floodColor={INK.ink} floodOpacity="0.28" />
        </filter>
        <filter id={`${id}-g`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.2  0 0 0 0 0.22  0 0 0 0.09 0" />
        </filter>
      </defs>
      {bg && <rect width={width} height={height} fill={bg} />}
      <SceneCtx.Provider value={`url(#${id}-s)`}>{children}</SceneCtx.Provider>
      {/* 紙纖維：蓋在最上層 */}
      <rect width={width} height={height} filter={`url(#${id}-g)`} style={{ pointerEvents: 'none' }} />
    </svg>
  );
};
PaperScene.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  bg: PropTypes.string,
  shadow: PropTypes.number,
  slice: PropTypes.bool,
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
