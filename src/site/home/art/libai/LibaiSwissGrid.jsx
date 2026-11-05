import { motion } from 'motion/react';
import { INK } from '../palette';

// 李白・K 模組網格：3×4 的方格，每一格只放一個幾何形。
// 帽頂兩角是四分之一圓、帽身是整格墨；眼睛是點；八字鬍是兩個鏽橘四分之一圓；
// 山羊鬍是三角；身體是墨格加一個紙色交領。
// 進場時一格一格落下，像排字盤上一塊一塊排上去的鉛字。
//
// 畫布 360×780，網格從 (30, 90) 開始，每格 100。

const T = 100;
const X0 = 30;
const Y0 = 90;
const at = (c, r) => [X0 + c * T, Y0 + r * T];
// 相鄰兩格同色時，反鋸齒會在接縫留一條細白線；整格的色塊多畫 1 單位蓋過去
const F = T + 1;

// 每一格的內容：以格子左上角為原點畫
const TILES = [
  // 第一列：帽
  [0, 0, (x, y) => <path d={`M ${x + F} ${y + F} L ${x} ${y + F} L ${x} ${y + T} A ${T} ${T} 0 0 1 ${x + T} ${y} L ${x + F} ${y} Z`} fill={INK.ink} />],
  [1, 0, (x, y) => <rect x={x} y={y} width={F} height={F} fill={INK.ink} />],
  [2, 0, (x, y) => <path d={`M ${x} ${y + F} L ${x} ${y} A ${T} ${T} 0 0 1 ${x + T} ${y + T} L ${x + T} ${y + F} Z`} fill={INK.ink} />],
  // 第二列：臉與眼
  [0, 1, (x, y) => <circle cx={x + 62} cy={y + 50} r="11" fill={INK.ink} />],
  [1, 1, (x, y) => <rect x={x + 44} y={y + 30} width="12" height="40" fill={INK.mid} />],
  [2, 1, (x, y) => <circle cx={x + 38} cy={y + 50} r="11" fill={INK.ink} />],
  // 第三列：鬍子
  [0, 2, (x, y) => <path d={`M ${x + T} ${y} L ${x + T} ${y + 60} A 60 60 0 0 1 ${x + 40} ${y} Z`} fill={INK.rust} />],
  [1, 2, (x, y) => <path d={`M ${x + 30} ${y + 10} L ${x + 70} ${y + 10} L ${x + 50} ${y + 90} Z`} fill={INK.ink} />],
  [2, 2, (x, y) => <path d={`M ${x} ${y} L ${x} ${y + 60} A 60 60 0 0 0 ${x + 60} ${y} Z`} fill={INK.rust} />],
  // 第四列：身體
  [0, 3, (x, y) => <rect x={x} y={y} width={F} height={F} fill={INK.ink} />],
  [1, 3, (x, y) => (
    <g>
      <rect x={x} y={y} width={F} height={F} fill={INK.ink} />
      <path d={`M ${x + 20} ${y} L ${x + 50} ${y + 70} L ${x + 80} ${y} Z`} fill={INK.paper} />
    </g>
  )],
  [2, 3, (x, y) => <rect x={x} y={y} width={F} height={F} fill={INK.ink} />],
];

const LibaiSwissGrid = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 臉的底：第二、三列鋪一塊皮膚色 */}
    <rect x={X0} y={Y0 + T} width={T * 3} height={T * 2} fill={INK.skin} />

    {/* 帽翅：帽與臉的交界，伸出網格外 */}
    <rect x="0" y={Y0 + T - 8} width="360" height="12" fill={INK.ink} />

    {TILES.map(([c, r, draw], i) => {
      const [x, y] = at(c, r);
      return (
        <motion.g
          key={`${c}-${r}`}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {draw(x, y)}
        </motion.g>
      );
    })}

    {/* 月亮：右上角，壓在網格外 */}
    <circle cx="300" cy="60" r="44" fill={INK.rust} />
  </svg>
);

export default LibaiSwissGrid;
