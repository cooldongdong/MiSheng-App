import { useId } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'motion/react';
import { INK } from './palette';
import { PaperScene, Sheet } from './paperKit';
import { roughCircle, cloudBand } from './paperUtils';

// 三種道具的示意插畫（第四種 Wheel 用 DiaryWheel）。每一張只演「這個道具在幹嘛」：
//   Img      一張圖：點一下，放大
//   Camera   拍一張帶走：取景框＋你做的框 → 喀嚓 → 一張照片滑出來
//   Overlay  數位透明片：半透明的片子慢慢對準牆上的圖，對上了，藏起來的符號就完整了
// 行為照 docs/sheet/prop.md。畫布 400×300。

const LOOP = { duration: 5, repeat: Infinity, ease: 'easeInOut' };

// 小風景：月亮＋雲，三張圖共用，讓「被拍的東西」看起來是同一個世界
const Scene = ({ x = 0, y = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect width="160" height="120" fill={INK.paperDeep} />
    <path d={roughCircle(108, 42, 22, { amp: 0.8, seed: 4 })} fill={INK.rustLight} />
    <path d={cloudBand(78, 16, { width: 160, height: 120 })} fill={INK.line} />
    <path d={cloudBand(96, 12, { width: 160, height: 120 })} fill={INK.paper} />
  </g>
);
Scene.propTypes = { x: PropTypes.number, y: PropTypes.number, s: PropTypes.number };

export const PropImgArt = ({ fit = 'cover' }) => (
  <PaperScene width={400} height={300} bg={INK.paperDeep} fit={fit}>
    {/* 照片卡：點一下放大、停一下、縮回去 */}
    <motion.g
      animate={{ scale: [1, 1, 1.9, 1.9, 1] }}
      transition={{ ...LOOP, times: [0, 0.25, 0.4, 0.75, 0.9] }}
    >
      <Sheet>
        <rect x="140" y="98" width="120" height="104" rx="4" fill="#fff" />
        <Scene x={148} y={106} s={0.65} />
      </Sheet>
    </motion.g>
    {/* 手指點一下的漣漪 */}
    <motion.circle
      cx="200"
      cy="150"
      r="16"
      fill="none"
      stroke={INK.rust}
      strokeWidth="4"
      animate={{ scale: [0.4, 0.4, 1.6, 1.6], opacity: [0, 0.9, 0, 0] }}
      transition={{ ...LOOP, times: [0, 0.2, 0.32, 1] }}
    />
  </PaperScene>
);

export const PropCameraArt = ({ fit = 'cover' }) => (
  <PaperScene width={400} height={300} bg={INK.paperDeep} fit={fit}>
    {/* 相機畫面：現場的風景 */}
    <Sheet>
      <rect x="100" y="30" width="200" height="240" rx="18" fill={INK.ink} />
      <Scene x={120} y={60} s={1} />
    </Sheet>
    {/* 取景框（4:5）＋套上去的框：鏽橘的花邊 */}
    <Sheet>
      <rect x="128" y="56" width="144" height="180" fill="none" stroke={INK.rust} strokeWidth="10" />
      <path d="M 128 56 l 24 0 M 128 56 l 0 24 M 272 56 l -24 0 M 272 56 l 0 24 M 128 236 l 24 0 M 128 236 l 0 -24 M 272 236 l -24 0 M 272 236 l 0 -24" stroke="#fff" strokeWidth="4" />
    </Sheet>
    {/* 快門閃光 */}
    <motion.rect
      x="100"
      y="30"
      width="200"
      height="240"
      rx="18"
      fill="#fff"
      animate={{ opacity: [0, 0, 0.9, 0, 0] }}
      transition={{ ...LOOP, times: [0, 0.3, 0.33, 0.42, 1] }}
    />
    {/* 拍下來的照片：從右邊滑出、歪一點 */}
    <motion.g
      animate={{ x: [0, 0, 80, 80, 0], opacity: [0, 0, 1, 1, 0], rotate: [0, 0, 8, 8, 0] }}
      transition={{ ...LOOP, times: [0, 0.4, 0.55, 0.85, 1] }}
    >
      <Sheet>
        <rect x="236" y="120" width="92" height="112" fill="#fff" />
        <rect x="242" y="126" width="80" height="92" fill="none" stroke={INK.rust} strokeWidth="5" />
        <Scene x={246} y={130} s={0.45} />
      </Sheet>
    </motion.g>
  </PaperScene>
);

// 牆上的圖：一顆星只畫了一半，另一半在透明片上。
// 用 SVG 的 <clipPath> 切半（星的中心在 x=200）。第一版用 CSS 的 clip-path: inset，
// 在 SVG 元素上沒生效，兩邊都畫出整顆星。透明片那半的 clipPath 放在會移動的群組裡，
// 所以它跟著片子一起走。
const STAR = 'M 200 92 L 216 136 L 262 136 L 225 162 L 239 206 L 200 180 L 161 206 L 175 162 L 138 136 L 184 136 Z';

export const PropOverlayArt = ({ fit = 'cover' }) => {
  const cid = `ov${useId().replace(/:/g, '')}`;
  return (
  <PaperScene width={400} height={300} bg={INK.paperDeep} fit={fit}>
    {/* 牆（帶不走的東西） */}
    <Sheet>
      <rect x="90" y="50" width="220" height="200" rx="6" fill={INK.paper} />
      <g stroke={INK.line} strokeWidth="3">
        <line x1="90" x2="310" y1="100" y2="100" />
        <line x1="90" x2="310" y1="150" y2="150" />
        <line x1="90" x2="310" y1="200" y2="200" />
      </g>
      {/* 星的左半 */}
      <defs>
        <clipPath id={`${cid}-l`}>
          <rect x="0" y="0" width="200" height="300" />
        </clipPath>
        <clipPath id={`${cid}-r`}>
          <rect x="200" y="0" width="200" height="300" />
        </clipPath>
      </defs>
      <path d={STAR} fill="none" stroke={INK.ink} strokeWidth="6" strokeLinejoin="round" clipPath={`url(#${cid}-l)`} />
    </Sheet>

    {/* 透明片：從歪的位置慢慢對準，再滑開 */}
    <motion.g
      animate={{ x: [-70, -70, 0, 0, -70], y: [30, 30, 0, 0, 30], rotate: [-14, -14, 0, 0, -14] }}
      transition={{ ...LOOP, duration: 6, times: [0, 0.15, 0.5, 0.8, 1] }}
    >
      <Sheet>
        <rect x="110" y="70" width="180" height="160" rx="6" fill="rgba(255,255,255,.45)" stroke="rgba(255,255,255,.9)" strokeWidth="2" />
        <path d={STAR} fill="none" stroke={INK.rust} strokeWidth="6" strokeLinejoin="round" clipPath={`url(#${cid}-r)`} />
      </Sheet>
    </motion.g>

    {/* 對上的那一刻：整顆星亮一下 */}
    <motion.path
      d={STAR}
      fill={INK.rustLight}
      animate={{ opacity: [0, 0, 0, 0.5, 0, 0] }}
      transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.5, 0.58, 0.7, 1] }}
    />
  </PaperScene>
  );
};

const fitProps = { fit: PropTypes.string };
PropImgArt.propTypes = fitProps;
PropCameraArt.propTypes = fitProps;
PropOverlayArt.propTypes = fitProps;
