import { INK } from './palette';
import { PaperScene, Sheet } from './paperKit';
import { roughCircle, cloudBand } from './paperUtils';

// 旁白・李白（疊紙）。四輪樣張選出來的 L 版。
// 後→前：月亮、遠山的雲、李白（每個零件都是一片紙）、最前面一排白雲。
// 各層以不同幅度漂，像看紙雕盒子時微微晃頭。
//
// 畫布 360×780，主體在上半部（下半會被對話框蓋住）。

const Libai = () => (
  <PaperScene>
    <Sheet drift={3} duration={12}>
      <path d={roughCircle(250, 170, 92, { amp: 1.2, seed: 3 })} fill={INK.rustLight} />
    </Sheet>
    <Sheet drift={5} duration={10}>
      <path d={cloudBand(420, 34)} fill={INK.line} />
    </Sheet>

    <Sheet drift={7} duration={9} flat>
      <Sheet>
        <rect x="112" y="440" width="150" height="240" rx="20" fill={INK.ink} />
        <path d="M 160 440 L 187 500 L 214 440 Z" fill={INK.paper} />
      </Sheet>
      <Sheet>
        <circle cx="187" cy="356" r="80" fill={INK.skin} />
      </Sheet>
      <Sheet>
        <path d="M 105 340 C 105 250 269 250 269 340 C 230 322 144 322 105 340 Z" fill={INK.ink} />
        <rect x="44" y="318" width="78" height="14" rx="7" fill={INK.ink} />
        <rect x="252" y="318" width="78" height="14" rx="7" fill={INK.ink} />
      </Sheet>
      <Sheet>
        <circle cx="156" cy="366" r="8" fill={INK.ink} />
        <circle cx="218" cy="366" r="8" fill={INK.ink} />
        <circle cx="136" cy="394" r="12" fill={INK.rustLight} opacity="0.6" />
        <circle cx="238" cy="394" r="12" fill={INK.rustLight} opacity="0.6" />
        <path d="M 186 398 C 172 392 152 398 144 412 C 160 406 174 406 186 408 Z" fill={INK.ink} />
        <path d="M 188 398 C 202 392 222 398 230 412 C 214 406 200 406 188 408 Z" fill={INK.ink} />
        <path d="M 176 420 L 198 420 L 187 452 Z" fill={INK.ink} />
      </Sheet>
      <Sheet>
        <circle cx="92" cy="486" r="20" fill={INK.rust} />
        <circle cx="92" cy="528" r="30" fill={INK.rust} />
        <rect x="86" y="458" width="12" height="12" rx="3" fill={INK.ink} />
      </Sheet>
    </Sheet>

    <Sheet drift={10} duration={8}>
      <path d={cloudBand(560, 26)} fill={INK.paper} />
    </Sheet>
  </PaperScene>
);

export default Libai;
