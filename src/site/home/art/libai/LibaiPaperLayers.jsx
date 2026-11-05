import { useId } from 'react';
import { motion } from 'motion/react';
import { INK } from '../palette';
import { PaperDefs, Grain } from '../paper';
import { roughCircle } from '../paperUtils';

// 李白・L 層疊紙雕：四層紙前後疊出景深，每一層都在下一層上投陰影。
// 後→前：月亮、遠山的雲、李白（每個零件都是一片紙）、最前面的一排雲。
// 各層以不同幅度左右漂，像在看一個紙雕盒子時微微晃頭。
//
// 畫布 360×780，主體在上半部。

const cloudBand = (y, r, seedOffset = 0) => {
  let d = `M -20 780 L -20 ${y}`;
  for (let x = -20, i = 0; x < 380; x += r * 2, i += 1) {
    const rr = r * (0.85 + ((i * 37 + seedOffset) % 7) / 20);
    d += ` a ${rr} ${rr} 0 0 1 ${r * 2} 0`;
  }
  return `${d} L 380 780 Z`;
};

const drift = (amp, dur) => ({
  animate: { x: [0, amp, 0, -amp, 0] },
  transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' },
});

const LibaiPaperLayers = () => {
  const id = `pl${useId().replace(/:/g, '')}`;
  const shadow = `url(#${id}-shadow)`;
  return (
    <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
      <PaperDefs id={id} />
      <rect width="360" height="780" fill={INK.paperDeep} />

      {/* 最後面：月亮 */}
      <motion.g {...drift(3, 12)} filter={shadow}>
        <path d={roughCircle(250, 170, 92, { amp: 1.2, seed: 3 })} fill={INK.rustLight} />
      </motion.g>

      {/* 遠方的雲山 */}
      <motion.g {...drift(5, 10)} filter={shadow}>
        <path d={cloudBand(420, 34, 2)} fill={INK.line} />
      </motion.g>

      {/* 李白：每個零件都是一片紙 */}
      <motion.g {...drift(7, 9)}>
        <g filter={shadow}>
          <rect x="112" y="440" width="150" height="240" rx="20" fill={INK.ink} />
          <path d="M 160 440 L 187 500 L 214 440 Z" fill={INK.paper} />
        </g>
        <g filter={shadow}>
          <circle cx="187" cy="356" r="80" fill={INK.skin} />
        </g>
        <g filter={shadow}>
          <path d="M 105 340 C 105 250 269 250 269 340 C 230 322 144 322 105 340 Z" fill={INK.ink} />
          <rect x="44" y="318" width="78" height="14" rx="7" fill={INK.ink} />
          <rect x="252" y="318" width="78" height="14" rx="7" fill={INK.ink} />
        </g>
        <g filter={shadow}>
          <circle cx="156" cy="366" r="8" fill={INK.ink} />
          <circle cx="218" cy="366" r="8" fill={INK.ink} />
          <circle cx="136" cy="394" r="12" fill={INK.rustLight} opacity="0.6" />
          <circle cx="238" cy="394" r="12" fill={INK.rustLight} opacity="0.6" />
          <path d="M 186 398 C 172 392 152 398 144 412 C 160 406 174 406 186 408 Z" fill={INK.ink} />
          <path d="M 188 398 C 202 392 222 398 230 412 C 214 406 200 406 188 408 Z" fill={INK.ink} />
          <path d="M 176 420 L 198 420 L 187 452 Z" fill={INK.ink} />
        </g>
        {/* 葫蘆 */}
        <g filter={shadow}>
          <circle cx="92" cy="486" r="20" fill={INK.rust} />
          <circle cx="92" cy="528" r="30" fill={INK.rust} />
          <rect x="86" y="458" width="12" height="12" rx="3" fill={INK.ink} />
        </g>
      </motion.g>

      {/* 最前面一排雲 */}
      <motion.g {...drift(10, 8)} filter={shadow}>
        <path d={cloudBand(560, 26, 5)} fill={INK.paper} />
      </motion.g>

      <Grain id={id} />
    </svg>
  );
};

export default LibaiPaperLayers;
