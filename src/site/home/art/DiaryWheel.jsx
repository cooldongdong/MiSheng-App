import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, useReducedMotion } from 'motion/react';
import { INK } from './palette';
import { PaperScene, Sheet } from './paperKit';

// 道具 Wheel：「前任智者的日記」（疊紙）。
// demo 裡它是封面上疊兩層可以轉的圓盤（rotateImg1、rotateImg2），轉到對的位置才讀得出字。
// 這裡每一層都是一片紙：書皮、書背、外圈、內圈、指針，各自投陰影。
// 外圈與內圈往反方向一格一格地轉，像有人在對密碼。
//
// **外圈不放 demo 真正的謎面。** 首頁是 demo 的入口，不能先劇透；
// 六個幾何符號只負責「看起來像密碼」。
//
// 畫布 400×400。

const CX = 214;
const CY = 200;
const SYMBOLS = [
  <circle key="o" r="10" />,
  <path key="tri" d="M 0 -11 L 11 9 L -11 9 Z" />,
  <rect key="sq" x="-9" y="-9" width="18" height="18" />,
  <path key="moon" d="M 3 -10.6 A 11 11 0 1 0 3 10.6 A 13 13 0 0 1 3 -10.6 Z" />,
  <path key="x" d="M -9 -9 L 9 9 M 9 -9 L -9 9" />,
  <path key="dia" d="M 0 -12 L 10 0 L 0 12 L -10 0 Z" />,
];

// 旋轉原點＝這一組的外框中心（motion 對 SVG 的預設）。兩組都以一個置中的圓為底，外框中心就是轉盤中心

const DiaryWheel = ({ fit = 'contain' }) => {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setStep((s) => s + 1), 1600);
    return () => clearInterval(id);
  }, [reduce]);

  const spring = { type: 'spring', stiffness: 140, damping: 14 };

  return (
    <PaperScene width={400} height={400} fit={fit}>
      <Sheet>
        <rect x="34" y="24" width="340" height="352" rx="14" fill={INK.ink} />
      </Sheet>
      <Sheet>
        <rect x="34" y="24" width="30" height="352" rx="6" fill={INK.rust} />
      </Sheet>

      <Sheet>
        <motion.g animate={{ rotate: -step * 60 }} transition={spring}>
          <circle cx={CX} cy={CY} r="140" fill={INK.paper} />
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
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                {sym}
              </g>
            );
          })}
        </motion.g>
      </Sheet>

      <Sheet>
        <motion.g animate={{ rotate: step * 120 }} transition={{ ...spring, delay: 0.15 }}>
          <circle cx={CX} cy={CY} r="104" fill={INK.rust} />
          <path
            d={`M ${CX - 24} ${CY - 104} L ${CX + 24} ${CY - 104} L ${CX + 14} ${CY - 60} L ${CX - 14} ${CY - 60} Z`}
            fill={INK.paper}
          />
        </motion.g>
      </Sheet>

      <Sheet>
        <circle cx={CX} cy={CY} r="60" fill={INK.paper} />
      </Sheet>
      <Sheet>
        <path d={`M ${CX} ${CY - 40} L ${CX + 10} ${CY} L ${CX - 10} ${CY} Z`} fill={INK.ink} />
        <circle cx={CX} cy={CY} r="11" fill={INK.ink} />
        <circle cx={CX} cy={CY} r="4" fill={INK.rustLight} />
      </Sheet>
    </PaperScene>
  );
};

DiaryWheel.propTypes = { fit: PropTypes.string };

export default DiaryWheel;
