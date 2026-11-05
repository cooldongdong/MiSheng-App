import { motion } from 'motion/react';
import { INK, STROKE } from './palette';

// 旁白（李白）：從牆後探出半張臉。
// 對照 demo 的 pangbai-s.jpg（黑色幞頭、八字鬍、牆在右邊），用幾何重畫：
// 頭是橢圓、幞頭是半圓加一個圓、鬍子是三筆。牆壓在臉上，所以臉只露出左邊大半。
//
// 畫布 360×780。主體在上半部。

const Libai = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 整個人慢慢地往牆外探、又縮回去一點 */}
    <motion.g
      animate={{ x: [0, -10, -10, 0, 0] }}
      transition={{ duration: 7, times: [0, 0.2, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
      stroke={INK.ink}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 衣服：白袍＋交領 */}
      <path d="M 40 780 C 50 600 90 540 200 520 C 290 530 330 600 340 780 Z" fill="#fafafa" />
      <path d="M 158 524 L 214 640 L 262 530" fill="none" />

      {/* 脖子與臉 */}
      <rect x="180" y="420" width="44" height="110" fill={INK.skin} />
      <ellipse cx="205" cy="340" rx="76" ry="96" fill={INK.skin} />

      {/* 幞頭：一整頂寬圓帽壓到耳上，帽後一條硬挺的帶子垂到肩。
          第一版用「帽身＋頂上一顆圓」，讀起來像髮髻——幞頭的辨識度在寬、不在高 */}
      <path d="M 124 318 L 96 470 L 116 474 L 146 330 Z" fill={INK.ink} />
      <path d="M 120 334 C 112 246 150 200 208 198 C 266 200 298 246 290 334 C 250 306 162 306 120 334 Z" fill={INK.ink} />
      <path d="M 158 214 C 176 200 240 200 258 214" fill="none" stroke={INK.mid} />

      {/* 眉毛：往上挑 */}
      <path d="M 150 322 L 184 314" fill="none" />
      <path d="M 210 314 L 246 320" fill="none" />

      {/* 眼睛：眨眼 */}
      <motion.g
        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 4.5, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}
      >
        <path d="M 154 346 Q 168 336 184 346" fill="none" />
        <path d="M 212 346 Q 226 336 242 346" fill="none" />
        <circle cx="169" cy="345" r="4.5" fill={INK.ink} stroke="none" />
        <circle cx="227" cy="345" r="4.5" fill={INK.ink} stroke="none" />
      </motion.g>

      {/* 鼻子、八字鬍、山羊鬍：鬍子是填色的面，不是細線——細線遠看會消失 */}
      <path d="M 200 352 L 194 392 L 206 394" fill="none" />
      <path d="M 202 404 C 186 400 162 410 148 434 C 170 424 186 420 202 418 Z" fill={INK.ink} />
      <path d="M 206 404 C 222 400 244 410 256 434 C 236 424 222 420 206 418 Z" fill={INK.ink} />
      <path d="M 188 436 C 190 470 198 500 204 512 C 210 500 218 470 220 436 Z" fill={INK.ink} />
    </motion.g>

    {/* 牆：壓在臉上 */}
    <rect x="262" y="0" width="98" height="780" fill={INK.paperDeep} />
    <g stroke={INK.line} strokeWidth={STROKE - 1}>
      {Array.from({ length: 16 }, (_, i) => (
        <line key={i} x1="262" x2="360" y1={30 + i * 48} y2={30 + i * 48} />
      ))}
    </g>
    <line x1="262" x2="262" y1="0" y2="780" stroke={INK.ink} strokeWidth={STROKE} />

    {/* 落款的印：唯一一塊鏽橘 */}
    <rect x="34" y="56" width="52" height="52" rx="6" fill={INK.rust} />
    <text
      x="60"
      y="92"
      textAnchor="middle"
      fontSize="30"
      fontWeight="700"
      fill={INK.paper}
      fontFamily='"Noto Serif TC", serif'
    >
      白
    </text>
  </svg>
);

export default Libai;
