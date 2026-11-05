import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・E 剪影 × 積木：B 的「月下舉杯」構圖，用 D 的幾何零件拼。
//
// B 的側面剪影會被讀成女性（巾子像髮髻、長袍像裙）。這版改成正面：
// 正面的幞頭兩片帽翅是水平伸出去的，那是唐代男子官帽最不會被認錯的輪廓。
// 全身仍是一塊墨，只有月亮是鏽橘。
//
// 畫布 360×780，主體在上半部。

const LibaiMoonBlocks = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />
    <circle cx="180" cy="300" r="150" fill={INK.rustLight} />

    <g fill={INK.ink}>
      {/* 地平線 */}
      <rect x="0" y="600" width="360" height="180" />

      {/* 袍子：梯形，肩膀圓一點 */}
      <path d="M 66 604 L 138 438 Q 180 418 222 438 L 294 604 Z" />

      {/* 頭、半圓幞頭、水平帽翅、倒三角鬍子 */}
      {/* 帽和頭同色，所以帽身要比頭高、比頭寬，中間再留一道紙色細縫——
          第一版兩者一樣大，連起來只剩「一個圓被一根橫槓穿過」 */}
      <circle cx="180" cy="400" r="38" />
      <path d="M 124 366 C 124 286 236 286 236 366 Z" />
      <rect x="56" y="352" width="72" height="13" />
      <rect x="232" y="352" width="72" height="13" />
      <line x1="140" x2="220" y1="368" y2="368" stroke={INK.rustLight} strokeWidth="4" />
      <path d="M 166 432 L 194 432 L 180 466 Z" />

      {/* 舉杯的手：慢慢舉高，敬月亮 */}
      <motion.g animate={{ y: [0, -10, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M 226 480 L 264 412 L 270 356" fill="none" stroke={INK.ink} strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 258 330 L 284 330 L 278 348 L 264 348 Z" />
      </motion.g>
    </g>
  </svg>
);

export default LibaiMoonBlocks;
