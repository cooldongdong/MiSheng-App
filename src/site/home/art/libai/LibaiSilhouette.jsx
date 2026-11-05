import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・剪影版：舉杯邀明月。
// 全身一塊濃墨剪影、側坐在石頭上舉起葫蘆，背後一輪鏽橘的月亮。
// 不畫五官、不描邊——剪紙的辨識度靠輪廓：寬帽、帽翅、翹起的鬍子、舉起的手。
//
// 畫布 360×780，主體在上半部。

const SPARKS = [
  [62, 120, 0],
  [318, 96, 0.8],
  [300, 420, 1.6],
  [48, 330, 2.2],
];

// 四角星
const spark = (x, y, r) =>
  `M ${x} ${y - r} Q ${x} ${y} ${x + r} ${y} Q ${x} ${y} ${x} ${y + r} Q ${x} ${y} ${x - r} ${y} Q ${x} ${y} ${x} ${y - r} Z`;

const LibaiSilhouette = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 月亮 */}
    <circle cx="206" cy="270" r="132" fill={INK.rustLight} />

    {/* 星：一閃一閃 */}
    {SPARKS.map(([x, y, d]) => (
      <motion.path
        key={`${x}-${y}`}
        d={spark(x, y, 10)}
        fill={INK.ink}
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 2.4, delay: d, repeat: Infinity }}
      />
    ))}

    <g fill={INK.ink}>
      {/* 石頭 */}
      <path d="M 0 560 C 60 520 120 506 190 512 C 260 518 320 530 360 552 L 360 780 L 0 780 Z" />

      {/* 側坐的身體：肩、前襟、往前伸的膝 */}
      <path d="M 150 412 C 162 398 202 394 224 404 L 238 470 C 250 498 262 516 276 524 L 118 530 C 116 482 128 436 150 412 Z" />
      <rect x="186" y="376" width="22" height="30" />

      {/* 頭（側臉）：鼻尖、往前翹的鬍子 */}
      <circle cx="198" cy="352" r="34" />
      <path d="M 228 344 L 242 360 L 228 366 Z" />
      <path d="M 212 378 L 240 414 L 204 390 Z" />

      {/* 幞頭側面：帽身包住後腦、頂上一個巾子，後面垂下兩條帶子。
          第一版把帽翅畫成一根橫棍，讀起來像有東西插過頭——側面看，帽帶是往下垂的 */}
      <path d="M 162 356 C 156 310 202 296 228 322 L 230 340 C 212 330 188 334 168 360 Z" />
      <ellipse cx="190" cy="314" rx="20" ry="22" />
      <path d="M 166 336 C 140 346 124 370 116 404 L 126 406 C 134 376 150 356 172 348 Z" />
      <path d="M 170 346 C 152 360 142 384 140 414 L 149 414 C 152 388 160 368 176 356 Z" />

      {/* 舉杯的手、垂下的寬袖、葫蘆口對著嘴：輕輕晃，像在倒酒 */}
      <motion.g animate={{ rotate: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M 212 416 L 256 426 L 250 384" fill="none" stroke={INK.ink} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 238 420 C 266 432 274 474 262 502 C 250 474 242 450 232 434 Z" />
        <g transform="rotate(48 256 352)">
          <circle cx="256" cy="360" r="17" />
          <circle cx="256" cy="333" r="11" />
          <rect x="251" y="312" width="10" height="12" rx="3" />
        </g>
      </motion.g>
    </g>
  </svg>
);

export default LibaiSilhouette;
