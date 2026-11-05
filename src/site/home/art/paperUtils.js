// 剪紙感插畫的幾何工具：手撕毛邊。
//
// **毛邊用固定種子的亂數。** 每次重繪都換一組亂數的話，邊緣會在每次 render 時抖動，
// 看起來像訊號不良，不像紙。同一個種子＝同一張紙。

// mulberry32：小、快、可重現
export const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const toPath = (pts) => `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;

// 撕過的多邊形：每條邊切成小段，每段往法線方向隨機偏一點
export const roughPoly = (points, { amp = 3, step = 7, seed = 1 } = {}) => {
  const rand = rng(seed);
  const out = [];
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.round(len / step));
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    for (let k = 0; k < n; k += 1) {
      const t = k / n;
      const j = (rand() - 0.5) * 2 * amp;
      out.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j]);
    }
  });
  return toPath(out);
};

// 撕過的圓（或圓的一段弧＋弦）
export const arcPoints = (cx, cy, r, from = 0, to = Math.PI * 2, n = 48) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

export const roughCircle = (cx, cy, r, opts) => roughPoly(arcPoints(cx, cy, r, 0, Math.PI * 2, 40).slice(0, -1), opts);

// 一排雲：底部封閉的半圓連續邊，當「一層紙」用。i 讓每一朵大小有點差
export const cloudBand = (y, r, { width = 360, height = 780, wobble = 0.15 } = {}) => {
  let d = `M -20 ${height} L -20 ${y}`;
  for (let x = -20, i = 0; x < width + 20; x += r * 2, i += 1) {
    const rr = r * (1 - wobble + ((i * 37) % 7) / (7 / (wobble * 2)));
    d += ` a ${rr} ${rr} 0 0 1 ${r * 2} 0`;
  }
  return `${d} L ${width + 20} ${height} Z`;
};
