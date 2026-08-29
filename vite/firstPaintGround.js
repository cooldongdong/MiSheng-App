import { basename } from 'node:path'
import { GROUND, GROUND_BY_ENTRY } from '../src/shared/ground.js'

// ── first-paint 的底色 ──────────────────────────────────────────────────
//
// 深色模式的底色必須在**第一次繪製之前**就定下來，否則重整時會先閃一格白。
// 而那一閃正好發生在使用者最沒有防備的時候，也就是當初要做深色模式的理由本身。
//
// 為什麼非得是「行內、阻塞、在 head」：
//   1. MUI 的 InitColorSchemeScript 是給 SSR 用的——它要把 script 寫進「伺服器送出的
//      HTML」。這個專案是純 CSR 的 Vite，script 由 React 掛載後才插入，那時白色已經畫
//      過了（而且 React 插入的 <script> 本來就不會執行）。
//   2. CSS 檔是被 main.jsx import 的，dev 模式下由 JS 注入，一樣太晚。build 之後才會
//      變成 <head> 裡的 <link>——**只有 production 不閃，是最糟的那種 bug**。
//
// 為什麼改成 plugin 產生，而不是像原本那樣抄進每一個 .html：
// 抄了兩份，兩份都跟 theme.js 對不上了（create 的深色停在 #1c2429、theme 是 #0e0f11；
// demo 的淺色停在 #363636、theme 是 #d9d9d9）。兩支檔案裡都寫著「改 theme.js 時這裡
// 要一起改」——**註解沒有攔住它，因為註解不是執行機制**。
// 現在值只有 src/shared/ground.js 一份，theme 與這裡都是它的消費者。
//
// 為什麼是 head-prepend 而不是接在 head 後面：
// 這幾個入口的 <head> 有一條連到 fonts.googleapis.com 的 <link rel=stylesheet>，而
// **classic <script> 必須等所有在它前面的樣式表載完才會執行**（規範如此，因為 script
// 可能會去讀 computed style）。原本這段接在字型 link 後面，等於「決定深色模式」這件事
// 被一個外部主機的往返擋住——熱快取時看不出來，冷啟動（第一次到訪、換網路）就是幾百毫秒。
// 放到 head 最前面，它就在解析到字型 link 之前跑完。
export const firstPaintGround = () => ({
  name: 'misheng-first-paint-ground',
  transformIndexHtml: {
    order: 'pre',
    handler(html, ctx) {
      const entry = basename(ctx.filename ?? ctx.path ?? 'index.html');
      const { light, dark } = GROUND[GROUND_BY_ENTRY[entry] ?? 'app'];
      return {
        html,
        tags: [
          // ── 瀏覽器自己的視窗底色 ──────────────────────────────────
          //
          // 上面那段管的是「頁面畫什麼」，這兩行管的是「瀏覽器在頁面外面畫什麼」。
          //
          // 2026-08-30 Dong 回報：換頁時會閃一下，**而且只有 Arc 會，Chrome 與 Safari
          // 不會**。Arc 跟 Chrome 是同一個引擎，頁面的繪製結果不可能不同——所以閃的
          // 不是頁面，是瀏覽器的視窗／側邊欄。Arc 會拿 theme-color 幫自己的介面上色，
          // 而這三個入口一個都沒有這個 meta，於是它用自己的預設（偏亮），換頁的空檔
          // 就露出來了。桌機版 Chrome 與 Safari 不拿它畫視窗，所以看不到。
          //
          // 順帶也修好手機：iOS Safari 與 Android Chrome 的網址列本來就吃這個值。
          {
            tag: 'meta',
            injectTo: 'head-prepend',
            attrs: { name: 'theme-color', content: light, media: '(prefers-color-scheme: light)' },
          },
          {
            tag: 'meta',
            injectTo: 'head-prepend',
            attrs: { name: 'theme-color', content: dark, media: '(prefers-color-scheme: dark)' },
          },
          {
            tag: 'style',
            injectTo: 'head-prepend',
            children: [
              `html{background:${light}}`,
              // 兜底：無痕視窗或封鎖 storage 時底下的 script 會走 catch，什麼屬性都沒設。
              // 沒有這條的話，系統是深色的人照樣會吃到淺色底。
              // :not([data-light]) 讓「明確選了淺色」仍然贏過系統設定。
              `@media(prefers-color-scheme:dark){html:not([data-light]){background:${dark}}}`,
              `html[data-dark]{background:${dark}}`,
            ].join(''),
          },
          {
            tag: 'script',
            injectTo: 'head-prepend',
            // 與 MUI 的 useColorScheme 共用同一個 localStorage key 與同一組屬性名
            // （colorSchemeSelector: 'data' ⇒ data-light / data-dark）。
            // 這裡只搶先算一次，算完 MUI 接手，兩邊結論一致所以不會打架。
            children:
              `try{var m=localStorage.getItem('mui-mode')||'system';` +
              `var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);` +
              `document.documentElement.setAttribute(d?'data-dark':'data-light','');` +
              // media 版的 theme-color 只答得出「作業系統是什麼」。手動選過深／淺的人
              // 那個答案是錯的，所以這裡把兩個都覆寫成真正的結論——哪一個 media 命中
              // 都會拿到同一個值。mode 是 system 時本來就一致，覆寫不改變任何事。
              `if(m!=='system'){var c=d?${JSON.stringify(dark)}:${JSON.stringify(light)};` +
              `document.querySelectorAll('meta[name=theme-color]').forEach(function(e){e.content=c})}` +
              `}catch(e){}`,
          },
        ],
      };
    },
  },
});
