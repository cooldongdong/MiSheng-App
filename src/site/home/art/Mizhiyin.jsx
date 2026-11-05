import { motion } from 'motion/react';
import { INK, STROKE } from './palette';

// 謎之音：雲層中間一個漩渦，一道聲波橫過去。
// 對照 demo 的 mizhiyin.jpg（雲、星系、聲波），用幾何重畫：
// 雲＝一排排的半圓，星系＝阿基米德螺線，聲波＝高斯包絡的正弦。
//
// 畫布 360×780（手機螢幕比例）。主體放在上半部：下半部會被對話框的漸層蓋住。

const W = 360;
const CX = 180;
const CY = 300;

// 一排雲：連續的半圓弧
const scallop = (y, r, offset = 0) => {
  let d = `M ${-r * 2 + offset} ${y}`;
  for (let x = -r * 2 + offset; x < W + r * 2; x += r * 2) d += ` a ${r} ${r} 0 0 1 ${r * 2} 0`;
  return d;
};

// 螺線：r 隨角度線性增加
const spiral = (() => {
  const pts = [];
  for (let t = 0; t <= Math.PI * 6; t += 0.12) {
    const r = 6 + (t / Math.PI) * 13;
    pts.push(`${(CX + r * Math.cos(t)).toFixed(1)} ${(CY + r * Math.sin(t)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
})();

// 聲波：中間振幅大、兩端收掉
const wave = (() => {
  const pts = [];
  for (let x = 0; x <= W; x += 3) {
    const a = 78 * Math.exp(-(((x - CX) / 105) ** 2));
    pts.push(`${x} ${(CY - a * Math.sin((x - CX) / 17)).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
})();

const STARS = [
  [120, 250, 2.5],
  [238, 262, 2],
  [214, 372, 3],
  [140, 360, 2],
  [258, 330, 2],
  [104, 312, 1.8],
];

const Mizhiyin = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    {/* 雲：上下各三排，越靠近漩渦越淡 */}
    <g fill="none" stroke={INK.line} strokeWidth={STROKE} strokeLinecap="round">
      <path d={scallop(70, 26, 0)} />
      <path d={scallop(118, 20, 14)} />
      <path d={scallop(160, 16, 4)} opacity="0.7" />
      <path d={scallop(452, 16, 10)} opacity="0.7" />
      <path d={scallop(496, 20, 0)} />
      <path d={scallop(548, 26, 18)} />
    </g>

    {/* 漩渦：濃墨的洞，裡面一條鏽橘螺線慢慢轉 */}
    <circle cx={CX} cy={CY} r="112" fill={INK.ink} />
    <motion.g
      animate={{ rotate: 360 }}
      transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
    >
      {/* 隱形的外框圓：讓這組的 bbox 中心剛好是漩渦中心，轉起來才不會晃 */}
      <circle cx={CX} cy={CY} r="112" fill="none" />
      <path d={spiral} fill="none" stroke={INK.rustLight} strokeWidth={STROKE} strokeLinecap="round" />
      {STARS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={INK.paper} />
      ))}
    </motion.g>

    {/* 聲波：先墊一條紙色粗線，墨線才不會跟洞糊在一起 */}
    <motion.g
      animate={{ scaleY: [1, 0.82, 1] }}
      // motion 對 SVG 元素預設 transform-box: fill-box、原點在外框中心：
      // 聲波上下對稱，所以中心就是 CY，不用另外指定
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d={wave} fill="none" stroke={INK.paper} strokeWidth={STROKE * 3.5} strokeLinejoin="round" />
      <path d={wave} fill="none" stroke={INK.ink} strokeWidth={STROKE} strokeLinejoin="round" />
    </motion.g>
  </svg>
);

export default Mizhiyin;
