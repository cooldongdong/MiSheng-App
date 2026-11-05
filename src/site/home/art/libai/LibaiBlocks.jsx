import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・幾何積木版：只用圓、半圓、三角、矩形，不描邊、純色塊。
// 偏海報感：帽子是一個濃墨半圓、眼睛是兩個方塊、鬍子是兩個鏽橘的四分之一圓。
// 背後偏一邊的鏽橘大圓是月亮，讓構圖不對稱。
//
// 畫布 360×780，主體在上半部。

const LibaiBlocks = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 月亮：偏右上 */}
    <circle cx="272" cy="170" r="96" fill={INK.rust} />

    {/* 身體與交領 */}
    <rect x="92" y="430" width="176" height="200" rx="4" fill={INK.ink} />
    <path d="M 146 430 L 180 506 L 214 430 Z" fill={INK.paper} />

    {/* 葫蘆 */}
    <circle cx="74" cy="480" r="20" fill={INK.rustLight} />
    <circle cx="74" cy="522" r="30" fill={INK.rustLight} />

    {/* 臉 */}
    <circle cx="180" cy="334" r="92" fill={INK.skin} />

    {/* 幞頭：半圓＋兩片帽翅（帽翅上下輕擺） */}
    <path d="M 86 320 A 94 94 0 0 1 274 320 Z" fill={INK.ink} />
    <motion.g animate={{ rotate: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
      <rect x="22" y="298" width="72" height="16" fill={INK.ink} transform="rotate(-10 94 306)" />
    </motion.g>
    <motion.g animate={{ rotate: [0, 6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
      <rect x="266" y="298" width="72" height="16" fill={INK.ink} transform="rotate(10 266 306)" />
    </motion.g>

    {/* 眼睛：兩個方塊 */}
    <rect x="134" y="338" width="16" height="16" fill={INK.ink} />
    <rect x="210" y="338" width="16" height="16" fill={INK.ink} />

    {/* 八字鬍：兩個四分之一圓；山羊鬍：倒三角 */}
    <path d="M 178 376 L 178 402 A 30 30 0 0 1 148 372 Z" fill={INK.rust} transform="rotate(-20 178 389)" />
    <path d="M 182 376 L 182 402 A 30 30 0 0 0 212 372 Z" fill={INK.rust} transform="rotate(20 182 389)" />
    <path d="M 166 410 L 194 410 L 180 446 Z" fill={INK.ink} />
  </svg>
);

export default LibaiBlocks;
