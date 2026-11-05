import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・F 積木舉杯：D 的幾何積木，加上 B 的敘事。
// 有臉、有色塊，但整個人是一個動作：把葫蘆舉向左上角的月亮。
// 眼睛從 D 的方塊改成兩條橫槓：微醺、瞇著眼。
//
// 畫布 360×780，主體在上半部。

const LibaiBlocksToast = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 月亮：左上 */}
    <circle cx="86" cy="150" r="74" fill={INK.rust} />

    {/* 身體與交領 */}
    <rect x="116" y="446" width="160" height="200" rx="4" fill={INK.ink} />
    <path d="M 166 446 L 196 512 L 226 446 Z" fill={INK.paper} />

    {/* 舉起的手臂＋葫蘆：一起輕輕晃 */}
    <motion.g
      animate={{ rotate: [0, -5, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <rect x="92" y="300" width="30" height="176" rx="15" fill={INK.ink} transform="rotate(-24 122 470)" />
      <g transform="rotate(-30 82 286)">
        <circle cx="82" cy="292" r="22" fill={INK.rustLight} />
        <circle cx="82" cy="258" r="14" fill={INK.rustLight} />
        <rect x="76" y="236" width="12" height="10" rx="2" fill={INK.ink} />
      </g>
    </motion.g>

    {/* 臉 */}
    <circle cx="196" cy="356" r="86" fill={INK.skin} />

    {/* 幞頭：半圓＋水平帽翅 */}
    <path d="M 108 342 A 88 88 0 0 1 284 342 Z" fill={INK.ink} />
    <rect x="44" y="322" width="70" height="14" fill={INK.ink} />
    <rect x="278" y="322" width="70" height="14" fill={INK.ink} />

    {/* 微醺的眼睛：兩條橫槓 */}
    <rect x="148" y="362" width="22" height="7" fill={INK.ink} />
    <rect x="222" y="362" width="22" height="7" fill={INK.ink} />

    {/* 腮紅、八字鬍（兩個四分之一圓）、山羊鬍（倒三角） */}
    <circle cx="140" cy="392" r="12" fill={INK.rustLight} opacity="0.5" />
    <circle cx="252" cy="392" r="12" fill={INK.rustLight} opacity="0.5" />
    <path d="M 194 396 L 194 420 A 28 28 0 0 1 166 392 Z" fill={INK.rust} transform="rotate(-20 194 408)" />
    <path d="M 198 396 L 198 420 A 28 28 0 0 0 226 392 Z" fill={INK.rust} transform="rotate(20 198 408)" />
    <path d="M 182 428 L 210 428 L 196 462 Z" fill={INK.ink} />
  </svg>
);

export default LibaiBlocksToast;
