import { useId } from 'react';
import { motion } from 'motion/react';
import { INK } from '../palette';
import { PaperDefs, Grain } from '../paper';

// 李白・M 傳統窗花：一整張鏽橘紅紙，圖案全部是「剪掉的洞」。
// 外緣剪成一圈花邊、內圈一圈小水滴紋、右上一彎月牙、四朵捲雲；
// 中間把李白的頭與肩膀剪空——帽子、眼睛、鬍子是「留下來沒剪的紙」，
// 所以它們跟外圈同一張紙、同一個顏色。這是窗花最核心的邏輯：只有一種顏色，靠洞說話。
// 整張紙像貼在窗上被風吹，微微擺動。
//
// 畫布 360×780，主體在上半部。

const CX = 180;
const CY = 300;
const R = 150;

// 花邊：圓周上一圈小半圓
const scallopCircle = (() => {
  const n = 28;
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const a1 = (i / n) * Math.PI * 2;
    const a2 = ((i + 1) / n) * Math.PI * 2;
    const [x1, y1] = [CX + R * Math.cos(a1), CY + R * Math.sin(a1)];
    const [x2, y2] = [CX + R * Math.cos(a2), CY + R * Math.sin(a2)];
    const r = (R * Math.PI) / n;
    d += `${i === 0 ? `M ${x1} ${y1}` : ''} A ${r} ${r} 0 0 1 ${x2} ${y2} `;
  }
  return `${d}Z`;
})();

// 水滴紋：朝圓心的小水滴
const drops = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * Math.PI * 2;
  const x = CX + 126 * Math.cos(a);
  const y = CY + 126 * Math.sin(a);
  const deg = (a * 180) / Math.PI + 90;
  return { x, y, deg };
});

const curl = (x, y, s = 1) =>
  `M ${x} ${y} c ${8 * s} -10 ${22 * s} -6 ${20 * s} 6 c ${-2 * s} 8 ${-12 * s} 8 ${-12 * s} 0`;

const LibaiWindowFlower = () => {
  const id = `wf${useId().replace(/:/g, '')}`;
  const HOLE = INK.paper;
  return (
    <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
      <PaperDefs id={id} shadow={4} />
      <rect width="360" height="780" fill={INK.paper} />

      <motion.g
        animate={{ rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* 紅紙本體 */}
        <path d={scallopCircle} fill={INK.rust} filter={`url(#${id}-shadow)`} />

        {/* 以下全部是剪掉的洞 */}
        <g fill={HOLE}>
          {drops.map(({ x, y, deg }) => (
            <path
              key={`${x}-${y}`}
              d="M 0 -7 C 5 -2 5 4 0 7 C -5 4 -5 -2 0 -7 Z"
              transform={`translate(${x} ${y}) rotate(${deg})`}
            />
          ))}
          {/* 月牙 */}
          <path d="M 252 190 A 30 30 0 1 0 286 232 A 36 36 0 0 1 252 190 Z" />
          {/* 頭與肩：整塊剪空 */}
          <circle cx={CX} cy="318" r="56" />
          <path d="M 112 428 C 116 398 146 382 180 380 C 214 382 244 398 248 428 Z" />
        </g>
        {/* 捲雲：剪成細線 */}
        <g fill="none" stroke={HOLE} strokeWidth="5" strokeLinecap="round">
          <path d={curl(78, 250)} />
          <path d={curl(90, 220, 0.8)} />
          <path d={curl(262, 330, -1)} />
          <path d={curl(248, 300, -0.8)} />
        </g>

        {/* 沒剪掉、留在洞裡的紙：帽、眼、鬍子、交領（跟外圈同一張紙） */}
        <g fill={INK.rust}>
          <path d="M 124 310 C 124 234 236 234 236 310 Z" />
          <rect x="88" y="298" width="184" height="12" />
          <circle cx="160" cy="334" r="6" />
          <circle cx="200" cy="334" r="6" />
          <path d="M 178 350 C 166 344 150 350 144 362 C 156 356 168 356 178 360 Z" />
          <path d="M 182 350 C 194 344 210 350 216 362 C 204 356 192 356 182 360 Z" />
          <path d="M 170 374 L 190 374 L 180 404 Z" />
          <path d="M 156 382 L 180 430 L 204 382 L 194 382 L 180 412 L 166 382 Z" />
        </g>
        {/* 帽子與臉之間留一道剪痕 */}
        <line x1="128" x2="232" y1="312" y2="312" stroke={HOLE} strokeWidth="3" />
      </motion.g>

      <Grain id={id} />
    </svg>
  );
};

export default LibaiWindowFlower;
