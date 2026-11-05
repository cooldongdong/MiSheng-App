import { motion } from 'motion/react';
import { INK, STROKE } from '../palette';

// 李白・G 剪紙鏤空：把 E 反過來。
// 底是夜色的濃墨，人是從墨裡剪掉的紙色，月亮是鏽橘。
// 外框一圈紙色細線、下方兩排雲，像一張貼在窗上的剪紙。
//
// 畫布 360×780，主體在上半部。

const scallop = (y, r, offset = 0) => {
  let d = `M ${-r * 2 + offset} ${y}`;
  for (let x = -r * 2 + offset; x < 360 + r * 2; x += r * 2) d += ` a ${r} ${r} 0 0 1 ${r * 2} 0`;
  return d;
};

const LibaiPapercut = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.ink} />
    <rect x="18" y="18" width="324" height="744" rx="10" fill="none" stroke={INK.paper} strokeWidth="2" opacity="0.5" />

    {/* 月亮：慢慢亮一點、暗一點 */}
    <motion.circle
      cx="196"
      cy="270"
      r="128"
      fill={INK.rustLight}
      animate={{ opacity: [1, 0.86, 1] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* 雲 */}
    <g fill="none" stroke={INK.paper} strokeWidth={STROKE} strokeLinecap="round" opacity="0.35">
      <path d={scallop(560, 18, 6)} />
      <path d={scallop(600, 24, 0)} />
    </g>

    {/* 剪下來的人：紙色 */}
    <g fill={INK.paper}>
      <path d="M 80 620 L 146 452 Q 184 434 222 452 L 288 620 Z" />
      {/* 帽比頭高、比頭寬，中間一道墨色細縫——同色的帽與頭才分得開 */}
      <circle cx="184" cy="412" r="36" />
      <path d="M 130 380 C 130 304 238 304 238 380 Z" />
      <rect x="64" y="367" width="70" height="12" />
      <rect x="234" y="367" width="70" height="12" />
      <line x1="146" x2="222" y1="382" y2="382" stroke={INK.ink} strokeWidth="4" />
      <path d="M 171 442 L 197 442 L 184 474 Z" fill={INK.ink} />
      <path d="M 226 490 L 262 424 L 268 372" fill="none" stroke={INK.paper} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 256 346 L 280 346 L 275 364 L 261 364 Z" />
    </g>
  </svg>
);

export default LibaiPapercut;
