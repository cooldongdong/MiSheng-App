import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・H 極簡符號：把人拿掉，只留「認得出是他」的最少零件。
// 一顆鏽橘月亮當臉，上面一頂寬幞頭，兩個點眼、兩撇鬍子、一撮山羊鬍。
// 像一枚 logo：遠遠看、縮很小都還認得。
//
// 畫布 360×780，主體在上半部。

const LibaiSymbol = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 月亮＝臉 */}
    <circle cx="180" cy="320" r="132" fill={INK.rustLight} />

    {/* 幞頭：壓在月亮上緣，帽翅伸出月亮外；整頂帽子偶爾歪一下 */}
    <motion.g
      animate={{ rotate: [0, 0, -6, -6, 0] }}
      transition={{ duration: 6, times: [0, 0.5, 0.6, 0.85, 1], repeat: Infinity, ease: 'easeInOut' }}
      fill={INK.ink}
    >
      <path d="M 100 262 A 80 80 0 0 1 260 262 Z" />
      <rect x="22" y="244" width="96" height="14" />
      <rect x="242" y="244" width="96" height="14" />
    </motion.g>

    {/* 眼睛：會眨 */}
    <motion.g
      animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
      transition={{ duration: 4.5, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}
      fill={INK.ink}
    >
      <circle cx="146" cy="318" r="10" />
      <circle cx="214" cy="318" r="10" />
    </motion.g>

    {/* 八字鬍＋山羊鬍 */}
    <g fill={INK.ink}>
      <path d="M 178 360 C 162 352 136 358 124 378 C 142 370 160 370 178 374 Z" />
      <path d="M 182 360 C 198 352 224 358 236 378 C 218 370 200 370 182 374 Z" />
      <path d="M 168 392 L 192 392 L 180 432 Z" />
    </g>
  </svg>
);

export default LibaiSymbol;
