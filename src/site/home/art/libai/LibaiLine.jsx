import { motion } from 'motion/react';
import { INK, STROKE } from '../palette';

// 李白・線描版：一支筆畫到底，幾乎不上色。
// 正面、微醺（眼睛瞇成兩道彎），整個人慢慢左右晃。
// 只有葫蘆用鏽橘的線——全圖唯一的顏色就是酒。
//
// 畫布 360×780，主體在上半部。

const LibaiLine = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    <motion.g
      animate={{ rotate: [-3, 3, -3] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      fill="none"
      stroke={INK.ink}
      // 線描版整張只靠線撐，比其他版粗一級，縮小之後才不會淡掉
      strokeWidth={STROKE + 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 身體 */}
      <path d="M 86 580 C 92 480 128 436 180 430 C 232 436 268 480 274 580" />
      <path d="M 150 438 L 180 492 L 210 438" />

      {/* 頭 */}
      <circle cx="180" cy="326" r="92" />

      {/* 幞頭：外框＋帽簷＋兩支帽翅 */}
      <path d="M 92 304 C 88 206 272 206 268 304" />
      <path d="M 92 304 Q 180 278 268 304" />
      <path d="M 96 288 L 34 266 M 34 266 L 30 278" />
      <path d="M 264 288 L 326 266 M 326 266 L 330 278" />

      {/* 微醺的眼睛 */}
      <path d="M 132 334 Q 148 318 164 334" />
      <path d="M 196 334 Q 212 318 228 334" />

      {/* 腮紅：三撇鏽橘 */}
      <g stroke={INK.rust} strokeWidth={STROKE - 1}>
        <path d="M 118 362 L 126 352 M 128 364 L 136 354 M 138 366 L 146 356" />
        <path d="M 214 366 L 222 356 M 224 364 L 232 354 M 234 362 L 242 352" />
      </g>

      {/* 捲捲的八字鬍、山羊鬍 */}
      <path d="M 180 370 C 168 360 148 362 142 376 C 140 384 150 386 152 380" />
      <path d="M 180 370 C 192 360 212 362 218 376 C 220 384 210 386 208 380" />
      <path d="M 180 392 L 180 424" />

      {/* 葫蘆：鏽橘線 */}
      <g stroke={INK.rust}>
        <circle cx="270" cy="480" r="16" />
        <circle cx="270" cy="516" r="24" />
        <path d="M 264 462 L 276 462 M 270 462 L 270 452 Q 256 440 246 452" />
      </g>
    </motion.g>
  </svg>
);

export default LibaiLine;
