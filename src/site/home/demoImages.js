// 角色 → 立繪的檔名，照 demo 的 character 表（character.straight）。
// 首頁各段沿用試算表的寫法：說話的是誰 → 查它的 straight 檔名 → art/index.js 查出重畫的插畫。
//
// 原本這裡還用 glob 載入 demo 的照片當備援；每個角色都有重畫的插畫之後，
// 照片一張都沒在用，留著只是讓首頁多依賴 demo submodule 一次。
export const STRAIGHT = {
  謎之音: 'mizhiyin.jpg',
  旁白: 'pangbai-s.jpg',
  '玩家.': 'bg2.jpg',
};
