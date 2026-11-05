import { motion } from 'motion/react';
import { INK } from './palette';
import { PaperScene, Sheet } from './paperKit';
import { cloudBand } from './paperUtils';

// 謎之音（疊紙）：沒有臉、只有聲音的角色。
// 上下兩疊雲夾著一個漩渦；漩渦是六片圓紙一片疊一片，圓心各偏一點、
// 各自用不同速度轉——偏心的圓紙疊起來轉，就是紙做的星系。
// 一條紙條剪成的聲波橫過去。
//
// 畫布 360×780，主體在上半部。

const CX = 180;
const CY = 300;
// 旋轉的原點：motion 對 SVG 一律以「這一組的外框中心」為原點。
// 所以每片偏心的圓紙旁邊都墊一個以漩渦中心為圓心的隱形圓，讓外框中心＝漩渦中心——
// 不墊的話，圓紙只會繞自己的圓心轉，看起來根本沒動。

// [半徑, 偏心距離, 顏色, 一圈幾秒（負的＝反轉，0＝不轉）]
const DISCS = [
  [118, 0, INK.ink, 0],
  [96, 10, INK.mid, 40],
  [76, 14, INK.rust, -30],
  [56, 12, INK.rustLight, 24],
  [36, 9, INK.paperDeep, -18],
  [16, 6, INK.paper, 12],
];

// 聲波：高斯包絡的正弦，畫成一條有厚度的紙條（上緣＋反向的下緣）
const wave = (() => {
  const top = [];
  const bottom = [];
  for (let x = -10; x <= 370; x += 4) {
    const a = 70 * Math.exp(-(((x - CX) / 105) ** 2));
    const y = CY - a * Math.sin((x - CX) / 17);
    top.push(`${x} ${(y - 5).toFixed(1)}`);
    bottom.unshift(`${x} ${(y + 5).toFixed(1)}`);
  }
  return `M ${top.join(' L ')} L ${bottom.join(' L ')} Z`;
})();

const Mizhiyin = () => (
  <PaperScene>
    {/* 上方的雲：倒過來的雲帶 */}
    <Sheet drift={4} duration={11}>
      <path d={cloudBand(150, 30)} fill={INK.line} transform="rotate(180 180 390)" />
    </Sheet>
    <Sheet drift={6} duration={9}>
      <path d={cloudBand(110, 22)} fill={INK.paper} transform="rotate(180 180 390)" />
    </Sheet>

    {/* 漩渦 */}
    {DISCS.map(([r, off, fill, period], i) => (
      <Sheet key={r}>
        <motion.g
          animate={period ? { rotate: period > 0 ? 360 : -360 } : undefined}
          transition={period ? { duration: Math.abs(period), repeat: Infinity, ease: 'linear' } : undefined}
        >
          <circle cx={CX} cy={CY} r={r + off + 1} fill="none" />
          <circle cx={CX + off * Math.cos(i)} cy={CY + off * Math.sin(i)} r={r} fill={fill} />
        </motion.g>
      </Sheet>
    ))}

    {/* 聲波紙條 */}
    <Sheet>
      <motion.path
        d={wave}
        fill={INK.paper}
        animate={{ scaleY: [1, 0.8, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </Sheet>

    {/* 下方的雲 */}
    <Sheet drift={5} duration={10}>
      <path d={cloudBand(470, 30)} fill={INK.line} />
    </Sheet>
    <Sheet drift={9} duration={8}>
      <path d={cloudBand(520, 24)} fill={INK.paper} />
    </Sheet>
  </PaperScene>
);

export default Mizhiyin;
