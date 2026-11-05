import { motion } from 'motion/react';
import { INK, STROKE } from './palette';

// 旁白（李白），Q 版：大頭、沒有脖子、圓眼、腮紅，手上抱一個酒葫蘆，從牆後探出來。
//
// **為什麼是 Q 版。** 第一版照 demo 的 pangbai-s.jpg 畫寫實比例，脖子比例怎麼調都怪
// ——用幾何拼寫實人像，每一個比例錯誤都很顯眼。Q 版把頭身比壓到約 1:1，
// 脖子直接不存在，辨識度改由「寬幞頭＋八字鬍＋葫蘆」這三個符號撐。
// 探頭的姿勢保留：demo 裡他自己說「這個宇宙中的我比較害羞」。
//
// 畫布 360×780。主體在上半部（約 y 130–560）。

const CX = 176; // 頭的中心
const CY = 300;
const R = 112; // 頭的半徑

const Libai = () => (
  <svg viewBox="0 0 360 780" preserveAspectRatio="xMidYMin slice" width="100%" height="100%" aria-hidden>
    <rect width="360" height="780" fill={INK.paper} />

    <motion.g
      animate={{ x: [0, -12, -12, 0, 0], rotate: [0, -3, -3, 0, 0] }}
      transition={{ duration: 7, times: [0, 0.2, 0.6, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
      stroke={INK.ink}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 身體：小小一塊白袍，頭直接坐在上面 */}
      <path d="M 92 560 C 92 470 116 410 176 404 C 236 410 260 470 260 560 Z" fill="#fafafa" />
      <path d="M 146 412 L 176 462 L 206 412" fill="none" />

      {/* 葫蘆：抱在胸前，鏽橘 */}
      <g>
        <circle cx="128" cy="470" r="20" fill={INK.rust} />
        <circle cx="128" cy="512" r="30" fill={INK.rust} />
        <path d="M 114 488 Q 128 494 142 488" fill="none" stroke={INK.paper} />
        <rect x="122" y="440" width="12" height="12" rx="3" fill={INK.ink} />
        {/* 抱著它的小手 */}
        <circle cx="156" cy="506" r="13" fill={INK.skin} />
      </g>

      {/* 頭 */}
      <circle cx={CX} cy={CY} r={R} fill={INK.skin} />

      {/* 幞頭：壓到眉上的寬圓帽，左右各翹出一片帽翅 */}
      <path d="M 54 268 L 18 242 L 26 226 L 66 248 Z" fill={INK.ink} />
      <path d="M 298 268 L 334 242 L 326 226 L 286 248 Z" fill={INK.ink} />
      <path
        d={`M ${CX - R - 2} 282 C ${CX - R} 170 ${CX - 60} 150 ${CX} 150 C ${CX + 60} 150 ${CX + R} 170 ${CX + R + 2} 282 C ${CX + 60} 254 ${CX - 60} 254 ${CX - R - 2} 282 Z`}
        fill={INK.ink}
      />
      <path d={`M ${CX - 50} 176 Q ${CX} 160 ${CX + 50} 176`} fill="none" stroke={INK.mid} />

      {/* 眼睛：大圓點＋高光，眨眼 */}
      <motion.g
        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 4.5, times: [0, 0.9, 0.93, 0.96, 1], repeat: Infinity }}
      >
        <circle cx={CX - 40} cy="318" r="11" fill={INK.ink} stroke="none" />
        <circle cx={CX + 40} cy="318" r="11" fill={INK.ink} stroke="none" />
        <circle cx={CX - 36} cy="313" r="3.5" fill="#fff" stroke="none" />
        <circle cx={CX + 44} cy="313" r="3.5" fill="#fff" stroke="none" />
      </motion.g>

      {/* 腮紅 */}
      <ellipse cx={CX - 70} cy="350" rx="18" ry="10" fill={INK.rustLight} opacity="0.45" stroke="none" />
      <ellipse cx={CX + 70} cy="350" rx="18" ry="10" fill={INK.rustLight} opacity="0.45" stroke="none" />

      {/* 八字鬍＋一撮山羊鬍：鬍子是填色的面，縮小了還看得見 */}
      <path
        d={`M ${CX - 2} 356 C ${CX - 18} 350 ${CX - 40} 356 ${CX - 50} 372 C ${CX - 34} 366 ${CX - 18} 366 ${CX - 2} 368 Z`}
        fill={INK.ink}
      />
      <path
        d={`M ${CX + 2} 356 C ${CX + 18} 350 ${CX + 40} 356 ${CX + 50} 372 C ${CX + 34} 366 ${CX + 18} 366 ${CX + 2} 368 Z`}
        fill={INK.ink}
      />
      <path d={`M ${CX - 10} 384 Q ${CX} 392 ${CX + 10} 384`} fill="none" />
      <path d={`M ${CX - 9} 402 L ${CX} 432 L ${CX + 9} 402 Z`} fill={INK.ink} />
    </motion.g>

    {/* 牆：右半邊，壓在帽翅與臉上——他還是有點害羞 */}
    <rect x="276" y="0" width="84" height="780" fill={INK.paperDeep} />
    <g stroke={INK.line} strokeWidth={STROKE - 1}>
      {Array.from({ length: 16 }, (_, i) => (
        <line key={i} x1="276" x2="360" y1={30 + i * 48} y2={30 + i * 48} />
      ))}
    </g>
    <line x1="276" x2="276" y1="0" y2="780" stroke={INK.ink} strokeWidth={STROKE} />
  </svg>
);

export default Libai;
