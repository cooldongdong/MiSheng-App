import PropTypes from 'prop-types';
import { motion } from 'motion/react';
import { INK } from './palette';
import { PaperScene, Sheet } from './paperKit';
import { roughCircle, cloudBand } from './paperUtils';

// 玩家（疊紙）：剛被旁白用「撈月」從湖裡撈起來的人。
// 現代人的短髮、帽 T，一臉「我在哪」；頭上飄著兩個鏽橘的問號紙片。
// 背景是湖：一彎倒映的月亮、兩層水波。
//
// 畫布 360×780，主體在上半部。

const Question = ({ x, y, s = 1, delay = 0 }) => (
  <motion.g
    animate={{ y: [0, -8, 0], rotate: [-6, 6, -6] }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeInOut' }}
  >
    <Sheet>
      <path
        d={`M ${x} ${y} c 0 ${-22 * s} ${34 * s} ${-22 * s} ${34 * s} 0 c 0 ${14 * s} ${-17 * s} ${14 * s} ${-17 * s} ${30 * s}`}
        fill="none"
        stroke={INK.rust}
        strokeWidth={9 * s}
        strokeLinecap="round"
      />
      <circle cx={x + 17 * s} cy={y + 50 * s} r={5.5 * s} fill={INK.rust} />
    </Sheet>
  </motion.g>
);

Question.propTypes = { x: PropTypes.number, y: PropTypes.number, s: PropTypes.number, delay: PropTypes.number };

const Player = () => (
  <PaperScene>
    {/* 湖上的月亮與水波 */}
    <Sheet drift={3} duration={12}>
      <path d={roughCircle(96, 150, 52, { amp: 1, seed: 9 })} fill={INK.paper} />
    </Sheet>
    <Sheet drift={5} duration={10}>
      <path d={cloudBand(410, 20, { wobble: 0.05 })} fill={INK.line} />
    </Sheet>

    {/* 人 */}
    <Sheet drift={6} duration={9} flat>
      {/* 帽 T */}
      <Sheet>
        <path d="M 100 680 L 100 500 C 100 452 140 430 180 430 C 220 430 260 452 260 500 L 260 680 Z" fill={INK.mid} />
        <path d="M 150 432 C 160 470 200 470 210 432" fill="none" stroke={INK.ink} strokeWidth="4" />
        <line x1="166" x2="164" y1="456" y2="500" stroke={INK.paper} strokeWidth="4" strokeLinecap="round" />
        <line x1="194" x2="196" y1="456" y2="500" stroke={INK.paper} strokeWidth="4" strokeLinecap="round" />
      </Sheet>
      {/* 頭 */}
      <Sheet>
        <circle cx="180" cy="350" r="80" fill={INK.skin} />
      </Sheet>
      {/* 短髮：一片紙，瀏海剪成鋸齒 */}
      <Sheet>
        <path
          d="M 100 352 C 92 270 150 252 182 254 C 228 256 268 286 262 346 L 248 322 L 236 340 L 222 314 L 206 336 L 192 310 L 176 334 L 160 312 L 146 336 L 130 316 L 116 344 Z"
          fill={INK.ink}
        />
      </Sheet>
      {/* 五官：圓眼、O 型嘴、一滴汗 */}
      <Sheet>
        <circle cx="150" cy="370" r="8" fill={INK.ink} />
        <circle cx="210" cy="370" r="8" fill={INK.ink} />
        <ellipse cx="180" cy="404" rx="7" ry="9" fill={INK.ink} />
        <path d="M 252 330 C 262 344 262 356 254 360 C 246 356 246 344 252 330 Z" fill="#fff" />
      </Sheet>
    </Sheet>

    <Question x={232} y={214} s={1} />
    <Question x={276} y={262} s={0.6} delay={0.6} />

    {/* 最前面的水 */}
    <Sheet drift={9} duration={8}>
      <path d={cloudBand(560, 16, { wobble: 0.05 })} fill={INK.paper} />
    </Sheet>
  </PaperScene>
);

export default Player;
