import { useId } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'motion/react';
import { INK } from '../palette';
import { PaperDefs, Grain } from '../paper';
import { roughPoly, roughCircle, arcPoints } from '../paperUtils';

// 李白・N 撕紙拼貼：每一塊都是手撕的紙，邊緣是毛的，底下露出一圈白色紙纖維。
// 拼的時候沒對得很準——每塊各歪一點點角度，那正是拼貼的手感。
// 進場時一塊一塊「貼」上去。
//
// 畫布 360×780，主體在上半部。

// 一塊撕紙：先墊一圈白色纖維（稍大、毛邊更大），再放色紙
// motion 對 SVG 預設以外框中心為原點旋轉／縮放，正好是每塊紙自己的中心
const Torn = ({ d, fiber, fill, rotate = 0, delay, shadow }) => (
  <motion.g
    initial={{ opacity: 0, scale: 1.12, rotate: rotate - 6 }}
    animate={{ opacity: 1, scale: 1, rotate }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    filter={shadow}
  >
    <path d={fiber} fill="#fbfbf9" />
    <path d={d} fill={fill} />
  </motion.g>
);
Torn.propTypes = {
  d: PropTypes.string,
  fiber: PropTypes.string,
  fill: PropTypes.string,
  rotate: PropTypes.number,
  delay: PropTypes.number,
  shadow: PropTypes.string,
};

const piece = (shape, seed) => ({
  d: shape(seed, 2.2),
  fiber: shape(seed + 100, 4.5, 3),
});

const PIECES = [
  // 每塊：形狀（同一個 shape 函式產生色紙與稍大的纖維層）、顏色、歪幾度；陣列順序＝貼上去的順序
  {
    ...piece((s, amp, g = 0) => roughCircle(246, 176, 92 + g, { amp, seed: s }), 1),
    fill: INK.rustLight,
    rotate: 0,
  },
  {
    ...piece((s, amp, g = 0) => roughPoly([[-10, 470 - g], [370, 440 - g], [370, 800], [-10, 800]], { amp, seed: s }), 2),
    fill: INK.line,
    rotate: 0,
  },
  {
    ...piece((s, amp, g = 0) => roughPoly([[112 - g, 690], [146 - g, 438 - g], [228 + g, 438 - g], [262 + g, 690]], { amp, seed: s }), 3),
    fill: INK.ink,
    rotate: 2,
  },
  {
    ...piece((s, amp, g = 0) => roughCircle(187, 360, 76 + g, { amp, seed: s }), 4),
    fill: INK.skin,
    rotate: -2,
  },
  {
    ...piece(
      (s, amp, g = 0) =>
        roughPoly([...arcPoints(187, 338, 82 + g, Math.PI, Math.PI * 2, 20).slice(0, -1), [269 + g, 338 + g], [105 - g, 338 + g]], {
          amp,
          seed: s,
        }),
      5
    ),
    fill: INK.ink,
    rotate: -3,
  },
  {
    ...piece((s, amp, g = 0) => roughPoly([[36 - g, 318 - g], [338 + g, 318 - g], [338 + g, 334 + g], [36 - g, 334 + g]], { amp, seed: s }), 6),
    fill: INK.ink,
    rotate: -3,
  },
  {
    ...piece((s, amp, g = 0) => roughPoly([[150 - g, 400 - g], [224 + g, 400 - g], [187, 462 + g]], { amp, seed: s }), 7),
    fill: INK.rust,
    rotate: 4,
  },
];

const LibaiTornCollage = () => {
  const id = `tc${useId().replace(/:/g, '')}`;
  const shadow = `url(#${id}-shadow)`;
  return (
    <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
      <PaperDefs id={id} shadow={2} />
      <rect width="360" height="780" fill={INK.paper} />

      {PIECES.map((p, i) => (
        <Torn key={i} {...p} delay={0.1 + i * 0.12} shadow={shadow} />
      ))}

      {/* 眼睛：兩小片圓紙 */}
      <g filter={shadow}>
        <path d={roughCircle(158, 368, 8, { amp: 1, seed: 21 })} fill={INK.ink} />
        <path d={roughCircle(216, 368, 8, { amp: 1, seed: 22 })} fill={INK.ink} />
      </g>

      <Grain id={id} />
    </svg>
  );
};

export default LibaiTornCollage;
