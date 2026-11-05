import PropTypes from 'prop-types';
import { INK } from './palette';
import { PaperScene, Sheet } from './paperKit';
import { cloudBand } from './paperUtils';

// 特色區的四個小圖示，同一套疊紙。畫布 160×120，全部靜止：
// 這一段是「讀」的，不需要每個圖示都在動。
// 不鋪底紙（bg={null}）：這段沒有卡片，圖示要直接站在頁面上，鋪了底紙就變成一塊灰色方磚。

const Icon = ({ children }) => (
  <PaperScene width={160} height={120} fit="contain" shadow={2} bg={null}>
    {children}
  </PaperScene>
);
Icon.propTypes = { children: PropTypes.node };

// 不用寫程式：一張試算表，其中一格是鏽橘的
export const SheetIcon = () => (
  <Icon>
    <Sheet>
      <rect x="30" y="18" width="100" height="84" rx="6" fill="#fff" />
    </Sheet>
    <g stroke={INK.line} strokeWidth="2">
      {[38, 56, 74].map((y) => (
        <line key={y} x1="30" x2="130" y1={y + 2} y2={y + 2} />
      ))}
      <line x1="62" x2="62" y1="18" y2="102" />
      <line x1="96" x2="96" y1="18" y2="102" />
    </g>
    <Sheet>
      <rect x="64" y="58" width="30" height="16" fill={INK.rust} />
    </Sheet>
  </Icon>
);

// 手機掃一下就開玩：一支手機，螢幕上是 QR
const QR = '111010110100111011001011010101110101101011100111';
export const PhoneIcon = () => (
  <Icon>
    <Sheet>
      <rect x="54" y="10" width="52" height="100" rx="10" fill={INK.ink} />
    </Sheet>
    <Sheet>
      <rect x="60" y="30" width="40" height="40" rx="2" fill="#fff" />
    </Sheet>
    {[...QR].map((b, i) =>
      b === '1' ? <rect key={i} x={63 + (i % 7) * 5} y={33 + Math.floor(i / 7) * 5} width="4.5" height="4.5" fill={INK.ink} /> : null
    )}
    <Sheet>
      <rect x="64" y="80" width="32" height="10" rx="5" fill={INK.rust} />
    </Sheet>
  </Icon>
);

// 遊戲留在你手上：一朵雲，裡面一個資料夾
export const CloudIcon = () => (
  <Icon>
    <Sheet>
      <path d={cloudBand(70, 18, { width: 160, height: 104, wobble: 0.3 })} fill={INK.line} transform="translate(0 -6)" />
    </Sheet>
    <Sheet>
      <path d="M 58 56 L 76 56 L 82 62 L 104 62 L 104 88 L 58 88 Z" fill={INK.rustLight} />
      <rect x="58" y="66" width="46" height="22" fill={INK.rust} />
    </Sheet>
  </Icon>
);

// 開源：一個打開的盒子，裡面露出 </>
export const OpenIcon = () => (
  <Icon>
    <Sheet>
      <path d="M 40 52 L 80 40 L 120 52 L 80 64 Z" fill={INK.paperDeep} />
    </Sheet>
    <Sheet>
      <path d="M 40 52 L 80 64 L 80 108 L 40 96 Z" fill={INK.mid} />
      <path d="M 120 52 L 80 64 L 80 108 L 120 96 Z" fill={INK.ink} />
    </Sheet>
    <Sheet>
      <path d="M 40 52 L 22 34 L 60 24 L 80 40 Z" fill={INK.line} />
      <path d="M 120 52 L 138 34 L 100 24 L 80 40 Z" fill="#fff" />
    </Sheet>
    <g fill="none" stroke={INK.rust} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 70 14 L 62 22 L 70 30" />
      <path d="M 90 14 L 98 22 L 90 30" />
      <path d="M 83 12 L 77 32" />
    </g>
  </Icon>
);
