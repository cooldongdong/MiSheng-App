import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { INK, STROKE } from './palette';

// 道具 Wheel：「前任智者的日記」。
// demo 裡它是封面上疊兩層可以轉的圓盤（rotateImg1、rotateImg2），轉到對的位置才讀得出字。
// 這裡把它畫成：深墨的書皮、鏽橘書背，外圈是六個符號，
// 外圈與內圈往反方向一格一格地轉，像有人在對密碼。
//
// **外圈不放 demo 真正的謎面。** 第一版放了第五關那六個字，等於在首頁把題目跟
// 解法方向一起公開——首頁是 demo 的入口，不能先劇透。符號只負責「看起來像密碼」。
//
// 畫布 400×400。

const CX = 214;
const CY = 200;
// 六個幾何符號（以原點為中心、約 22 寬），跟插畫同一套筆觸
const SYMBOLS = [
  <circle key="o" r="10" />,
  <path key="tri" d="M 0 -11 L 11 9 L -11 9 Z" />,
  <rect key="sq" x="-9" y="-9" width="18" height="18" />,
  <path key="moon" d="M 3 -10.6 A 11 11 0 1 0 3 10.6 A 13 13 0 0 1 3 -10.6 Z" />,
  <path key="x" d="M -9 -9 L 9 9 M 9 -9 L -9 9" />,
  <path key="dia" d="M 0 -12 L 10 0 L 0 12 L -10 0 Z" />,
];

const DiaryWheel = () => {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setStep((s) => s + 1), 1600);
    return () => clearInterval(id);
  }, [reduce]);

  const spring = { type: 'spring', stiffness: 140, damping: 14 };

  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden>
      {/* 書皮與書背 */}
      <rect x="34" y="24" width="340" height="352" rx="14" fill={INK.ink} />
      <rect x="34" y="24" width="30" height="352" rx="6" fill={INK.rust} />
      <g stroke={INK.mid} strokeWidth={STROKE - 1}>
        <line x1="49" x2="49" y1="44" y2="356" strokeDasharray="2 12" strokeLinecap="round" />
      </g>

      {/* 外圈：六個符號，逆時針一格一格轉 */}
      <motion.g animate={{ rotate: -step * 60 }} transition={spring}>
        <circle cx={CX} cy={CY} r="140" fill={INK.paper} stroke={INK.paper} strokeWidth={STROKE} />
        <circle cx={CX} cy={CY} r="108" fill="none" stroke={INK.line} strokeWidth={STROKE - 1} />
        {SYMBOLS.map((sym, i) => {
          const a = (i * 60 - 90) * (Math.PI / 180);
          const x = CX + 124 * Math.cos(a);
          const y = CY + 124 * Math.sin(a);
          return (
            <g
              key={i}
              transform={`translate(${x} ${y}) rotate(${i * 60})`}
              fill="none"
              stroke={INK.ink}
              strokeWidth={STROKE}
              strokeLinejoin="round"
              strokeLinecap="round"
            >
              {sym}
            </g>
          );
        })}
      </motion.g>

      {/* 內圈：鏽橘圓盤，開一個窗，順時針轉 */}
      <motion.g animate={{ rotate: step * 120 }} transition={{ ...spring, delay: 0.15 }}>
        <circle cx={CX} cy={CY} r="104" fill={INK.rust} />
        <path
          d={`M ${CX - 24} ${CY - 104} L ${CX + 24} ${CY - 104} L ${CX + 14} ${CY - 60} L ${CX - 14} ${CY - 60} Z`}
          fill={INK.paper}
        />
        <circle cx={CX} cy={CY} r="60" fill={INK.paper} stroke={INK.ink} strokeWidth={STROKE} />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={CX + 48 * Math.cos(a)}
              y1={CY + 48 * Math.sin(a)}
              x2={CX + 56 * Math.cos(a)}
              y2={CY + 56 * Math.sin(a)}
              stroke={INK.ink}
              strokeWidth={STROKE - 1}
              strokeLinecap="round"
            />
          );
        })}
      </motion.g>

      {/* 中心：指針與軸 */}
      <path d={`M ${CX} ${CY - 34} L ${CX + 9} ${CY} L ${CX - 9} ${CY} Z`} fill={INK.ink} />
      <circle cx={CX} cy={CY} r="10" fill={INK.ink} />
      <circle cx={CX} cy={CY} r="4" fill={INK.rustLight} />
    </svg>
  );
};

export default DiaryWheel;
