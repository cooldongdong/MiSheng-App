// 首頁借用 demo 遊戲「多列宇宙」的幾張圖（CC BY-NC 4.0，標示寫在 footer）。
//
// **為什麼用 glob 而不是直接 import。** demo 是 submodule；忘了帶 --recurse-submodules
// clone 的人，直接 import 會讓整個首頁 build 失敗。glob 找不到檔就是空物件——
// 手機畫面退回純色底，首頁照常跑。
//
// 只列首頁真的用到的那幾張，不是整個 img 資料夾：eager glob 會把每一張都變成產物。
const files = import.meta.glob(
  '../../gameFile/demo/img/{mizhiyin,pangbai-s,bg2,fengmian}.jpg',
  { eager: true, query: '?url', import: 'default' }
);

export const demoImg = (name) => (name ? files[`../../gameFile/demo/img/${name}`] ?? null : null);

// 角色 → 立繪，照 demo 的 character 表
export const STRAIGHT = {
  謎之音: 'mizhiyin.jpg',
  旁白: 'pangbai-s.jpg',
  '玩家.': 'bg2.jpg',
};
