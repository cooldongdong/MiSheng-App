import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・I 瑞士海報：六欄網格（每欄 60），每一塊都落在欄線上。
// 人只用矩形與半圓、全部軸對齊；鏽橘大圓是月亮；
// 右側一欄放直排的粗黑「旁白」，字本身就是構圖的一部分。
// 底下一條細線＋一行小字，是瑞士海報固定會有的資訊層。
//
// 畫布 360×780，主體在上半部（手機下半會被對話框蓋住，資訊層只在樣張看得到）。

const SANS = '"Noto Sans TC", sans-serif';

const LibaiSwissPoster = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 月亮：第 3–6 欄，緩緩升起 */}
    <motion.circle
      cx="240"
      cy="180"
      r="120"
      fill={INK.rust}
      initial={{ y: 30 }}
      animate={{ y: 0 }}
      transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
    />

    <g fill={INK.ink}>
      {/* 幞頭：第 2–3 欄的半圓＋矩形，帽翅橫跨第 1–5 欄 */}
      <path d="M 90 270 A 60 60 0 0 1 210 270 Z" />
      <rect x="90" y="270" width="120" height="30" />
      <rect x="30" y="296" width="240" height="10" />

      {/* 頭：中墨的圓；鬍子：倒三角 */}
      <circle cx="150" cy="352" r="46" fill={INK.mid} />
      <path d="M 134 398 L 166 398 L 150 440 Z" />

      {/* 身體 */}
      <rect x="90" y="420" width="120" height="200" />
    </g>

    {/* 直排的「旁白」：第 6 欄 */}
    <g fontFamily={SANS} fontWeight="900" fontSize="64" fill={INK.ink} textAnchor="middle">
      <text x="300" y="380">旁</text>
      <text x="300" y="448">白</text>
    </g>

    {/* 資訊層：細線＋小字 */}
    <line x1="30" x2="330" y1="644" y2="644" stroke={INK.ink} strokeWidth="2" />
    <g fontFamily={SANS} fill={INK.ink}>
      <text x="30" y="672" fontSize="15" fontWeight="700">李白</text>
      <text x="30" y="692" fontSize="12">701-762</text>
      <text x="210" y="672" fontSize="12">謎生 demo</text>
      <text x="210" y="692" fontSize="12">多列宇宙</text>
    </g>
  </svg>
);

export default LibaiSwissPoster;
