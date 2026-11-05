// 主題色加透明度。用 CSS 變數的 channel，深淺色切換時才會跟著換
// （sx 函式裡的 t.palette.* 只拿得到預設那一組的值）。
export const tint = (token, a) => (t) => `rgba(${t.vars.palette[token].mainChannel} / ${a})`;
