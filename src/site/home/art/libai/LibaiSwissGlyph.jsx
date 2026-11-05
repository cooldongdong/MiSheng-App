import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・J 字即圖：一個巨大的粗黑「白」字就是他的臉。
// 鏽橘的幞頭戴在字頂上、鏽橘的山羊鬍掛在字底下——字戴了帽子，就變成一個人。
// 這是瑞士平面最典型的手法：字形本身當圖形用，不另外畫插圖。
//
// 畫布 360×780，主體在上半部。

const SANS = '"Noto Sans TC", sans-serif';

const LibaiSwissGlyph = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 白：字本身 */}
    <text
      x="180"
      y="520"
      textAnchor="middle"
      fontFamily={SANS}
      fontWeight="900"
      fontSize="300"
      fill={INK.ink}
    >
      白
    </text>

    {/* 幞頭：偶爾歪一下 */}
    <motion.g
      animate={{ rotate: [0, 0, -7, -7, 0] }}
      transition={{ duration: 6, times: [0, 0.5, 0.6, 0.85, 1], repeat: Infinity, ease: 'easeInOut' }}
      fill={INK.rust}
    >
      {/* 帽翅貼齊「白」的口字框頂、帽身蓋住頂上那一撇——帽子要戴上去，不是浮在上面 */}
      <path d="M 110 300 A 70 70 0 0 1 250 300 Z" />
      <rect x="20" y="292" width="320" height="12" />
    </motion.g>

    {/* 山羊鬍 */}
    <path d="M 164 540 L 196 540 L 180 590 Z" fill={INK.rust} />

    {/* 一條細線＋小字 */}
    <line x1="30" x2="330" y1="644" y2="644" stroke={INK.ink} strokeWidth="2" />
    <text x="30" y="672" fontFamily={SANS} fontSize="15" fontWeight="700" fill={INK.ink}>
      旁白
    </text>
  </svg>
);

export default LibaiSwissGlyph;
