import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import qrcode from 'qrcode-generator';

// 一張 QR，畫成 SVG。
//
// 為什麼是 SVG 而不是 canvas：放大不糊（現場要印出來貼牆的話這是必要的）、
// 不必等 ref 就緒、也不用處理 devicePixelRatio。
//
// ── 為什麼永遠是「深色圖案配白底」，即使在深色模式 ──────────────────
// 深色模式下把它反過來（淺圖案配深底）在畫面上比較好看，而且多數現代的手機相機
// 認得出來——但**只是多數**。QR 的規範預設是深色圖案配淺底，反色屬於掃描器的
// 額外體貼，不是保證。這張圖唯一的工作是被掃到，所以它不參與深淺色，
// 一律白底黑點，外面包一塊白色圓角當靜區。
//
// ── 靜區（quiet zone）不能省 ──────────────────────────────────────
// 規範要求圖案四周留 4 個模組寬的空白，掃描器靠它找到圖案邊界。
// 這裡用 viewBox 往外擴，而不是靠 padding——padding 是 CSS 的事，
// 而這張圖可能被右鍵存下來、被截圖、被印出來，那些情況下 CSS 不會跟著走。
const QUIET = 4;

const QrCode = ({ value, size = 148 }) => {
  const { d, span } = useMemo(() => {
    // 0 ＝ 讓它自己挑容得下的最小版本；'M' ＝ 中等容錯（約 15%），
    // 印出來被弄髒一角還讀得到，而又不會把圖案變得太密
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { d: path, span: count + QUIET * 2 };
  }, [value]);

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: 1.5,
        p: 0.5,
        lineHeight: 0,
        display: 'inline-block',
      }}
    >
      <Box
        component="svg"
        viewBox={`${-QUIET} ${-QUIET} ${span} ${span}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR code：${value}`}
        sx={{ width: size, height: size, display: 'block' }}
      >
        <rect x={-QUIET} y={-QUIET} width={span} height={span} fill="#fff" />
        <path d={d} fill="#000" />
      </Box>
    </Box>
  );
};

QrCode.propTypes = {
  value: PropTypes.string.isRequired,
  size: PropTypes.number,
};

export default QrCode;
