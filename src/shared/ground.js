// ground.js
// 「底」——每一種畫面在**第一格畫面**要塗的顏色。零 import，跟 flowPalette 同一個理由。
//
// 這個檔存在的原因，是一個已經咬過人的 bug：
//
// 深色模式重整時會先閃一格白，所以 create.html 與 demo.html 各自在 <head> 裡行內
// 寫死了一份底色。兩支檔案都留了註解「改 theme.js 時這裡要一起改」——**然後兩份都沒跟上**：
//   create.html 深色停在 #1c2429，theme 早就是 #0e0f11
//   demo.html   淺色停在 #363636，theme 是 #d9d9d9（深灰 vs 淺灰，肉眼一看就是閃）
//
// 註解不是執行機制。所以改成反過來：**值住在這裡，theme.js 是它的消費者**，
// 而 <head> 那段由 vite plugin 從同一個檔案產生（見 vite.config.js）。
// 這樣「兩份會不一致」在結構上就不成立，不必靠任何人記得。
//
// 為什麼是兩組而不是一組：
//   app  ＝ 官網與 /create 的最外層（theme 的 background.default）
//   game ＝ 遊戲畫面兩側的襯底（theme 的 game.frame）——/demo 的最外層本來就不是白的
export const GROUND = {
  app: { light: '#fff', dark: '#0e0f11' },
  game: { light: '#d9d9d9', dark: '#08090a' },
};

// 哪個入口用哪一種底。vite plugin 與 theme 都看這張表。
export const GROUND_BY_ENTRY = {
  'index.html': 'app', // 官網首頁
  'create.html': 'app', // 即時轉化
  'demo.html': 'game', // 播放器（build-time 的 demo 遊戲）
  'player.html': 'game', // 獨立播放器（使用者自己部署的那一份）
};
