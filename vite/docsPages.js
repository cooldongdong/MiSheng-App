import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { GROUND } from '../src/shared/ground.js';

// ── 把 docs/*.md 變成站台上的頁面 ──────────────────────────────────────
//
// **為什麼不直接連 GitHub。** 原本匯出的 README 與 /create 都連到
// github.com/cooldongdong/MiSheng-App/blob/main/docs/…，而那個帳號 2026-09-01
// 被停權之後，**那些連結全部是死的**——包括已經交到創作者手上的匯出包裡那一條。
//
// 更根本的問題是：那些文件是**產品的一部分**（創作者照著它做才收得到資料），
// 而產品的一部分不該住在一個我們控制不了、隨時可能連不上的地方。
//
// 所以改由自己的網站供應：`docs/收集玩家紀錄.md` → `https://misheng.app/docs/collect`
//
// **檔名到網址用明確的對照表，不用中文檔名轉譯。** 一來 `如何自己部署遊戲？.md`
// 帶著問號，那在網址裡是查詢字串的開頭；二來中文網址在聊天軟體裡貼出去會變成
// 一長串 %E6%94%B6…，沒有人看得出那是什麼。
//
// 產出寫進 public/，跟 player.zip 同一個模式：它是 build 產物，不進 git。
const PAGES = [
  {
    md: '試算表怎麼填.md',
    slug: 'sheet',
    title: '試算表怎麼填',
    lead: '七張表分別管什麼、哪些欄位非填不可、它們之間怎麼連起來',
  },
  {
    md: '如何自己部署遊戲？.md',
    slug: 'deploy',
    title: '如何自己部署遊戲',
    lead: '把匯出的資料夾放上網，變成一條玩家點得開的網址',
  },
  {
    md: '收集玩家紀錄.md',
    slug: 'collect',
    title: '收集玩家的遊戲紀錄',
    lead: '玩家卡在哪、打錯什麼答案——自動流進你自己的試算表，並算成報表',
  },
];

// 目錄頁。**先做這個，而不是導入一套文件產生器。**
//
// 生成器（VitePress／Docusaurus）換來的主要是導覽與搜尋，那是頁數多才會痛的問題，
// 而現在只有三頁。導入等於為了還沒發生的問題背一整套主題與設定。
// 真的長到十頁再換——markdown 原始檔可以直接搬過去，不會白做。
const indexHtml = () => `<h1>謎生文件</h1>
<p>從第一份試算表到一場真的活動，中間會用到的三份東西。</p>
${PAGES.map(
  (p) => `<h2 style="border:none;padding:0;margin:2.5rem 0 .3rem">
  <a href="/docs/${p.slug}">${p.title}</a></h2>
  <p style="margin:0;color:var(--muted)">${p.lead}</p>`
).join('\n')}
<hr>
<p style="color:var(--muted);font-size:.95rem">
還沒開始的話，先去<a href="/demo">玩一次 demo</a>——那款遊戲本身就在解釋這些表，
玩完再看文件會快很多。</p>`;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 只有樣式，沒有 JS。文件頁不需要 React——多載一份 bundle 只為了顯示一頁文字，
// 而且它要在最爛的網路下也能打開（創作者可能站在活動現場翻它）。
const shell = (title, body) => `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}｜謎生 Misheng</title>
<meta name="theme-color" content="${GROUND.app.light}" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="${GROUND.app.dark}" media="(prefers-color-scheme: dark)">
<style>
  :root {
    --bg: ${GROUND.app.light}; --fg: #1c2429; --muted: #5b6770;
    --line: #d6dade; --code-bg: #eceff1; --link: #b2591f;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: ${GROUND.app.dark}; --fg: #dfe4e8; --muted: #97a2aa;
      --line: #2c3439; --code-bg: #1c2429; --link: #e08a4a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font-family: "Noto Serif TC", "PingFang TC", "Microsoft JhengHei", serif;
    line-height: 1.85; font-size: 17px;
    -webkit-text-size-adjust: 100%;
  }
  main { max-width: 46rem; margin: 0 auto; padding: 3rem 1.25rem 6rem; }
  a { color: var(--link); }
  h1 { font-size: 1.9rem; line-height: 1.4; margin: 0 0 2rem; }
  h2 { font-size: 1.35rem; margin: 3rem 0 1rem; padding-top: 1.5rem; border-top: 1px solid var(--line); }
  h3 { font-size: 1.1rem; margin: 2rem 0 .75rem; }
  code {
    background: var(--code-bg); padding: .12em .4em; border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em;
  }
  pre {
    background: var(--code-bg); padding: 1rem; border-radius: 8px;
    overflow-x: auto; line-height: 1.6;
  }
  pre code { background: none; padding: 0; }
  blockquote {
    margin: 1.5rem 0; padding: .25rem 0 .25rem 1.25rem;
    border-left: 3px solid var(--line); color: var(--muted);
  }
  table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; font-size: .95em; }
  th, td { border: 1px solid var(--line); padding: .5rem .75rem; text-align: left; }
  th { background: var(--code-bg); }
  /* 表格在手機上會撐破版面——給它自己的捲動範圍，不要讓整頁橫向捲 */
  .table-wrap { overflow-x: auto; }
  hr { border: none; border-top: 1px solid var(--line); margin: 3rem 0; }
  /* markdown 裡的 --- 後面常常就接著一個 h2，而 h2 自己也有上框線——
     兩條線疊在一起會多出一段空白。後面接 h2 的分隔線就讓 h2 去畫 */
  hr + h2 { border-top: none; padding-top: 0; margin-top: 0; }
  .back { display: inline-block; margin-bottom: 2rem; color: var(--muted); text-decoration: none; font-size: .9rem; }
  .back:hover { color: var(--link); }
  /* 嵌進來的整份腳本：給它自己的高度上限，不然一頁文件會被一份程式碼佔滿 */
  .snippet { position: relative; margin: 1.5rem 0; }
  .snippet pre { max-height: 26rem; overflow: auto; margin: 0; }
  .copy {
    position: absolute; top: .6rem; right: .6rem; z-index: 1;
    font: inherit; font-size: .85rem; padding: .3rem .7rem;
    background: var(--bg); color: var(--fg);
    border: 1px solid var(--line); border-radius: 6px; cursor: pointer;
  }
  .copy:hover { border-color: var(--link); color: var(--link); }
</style>
</head>
<body>
<main>
<a class="back" href="/">← 回謎生</a>
${body}
</main>
<script>
// 這一頁唯一的 JS，而且是**漸進增強**——沒有它整份腳本照樣看得到、選得到，
// 只是要自己拖曳選取。所以不必擔心它在哪個瀏覽器不動。
//
// 留了 execCommand 的舊寫法：navigator.clipboard 要 secure context，
// 而創作者可能從一個奇怪的地方打開這一頁（2026-09-06 在匯出面板上踩過同一件事）。
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var text = btn.parentNode.querySelector('code').innerText;
    var done = function (ok) {
      btn.textContent = ok ? '已複製' : '複製失敗，請手動選取';
      setTimeout(function () { btn.textContent = '複製整份'; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); },
                                              function () { done(false); });
      return;
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      done(document.execCommand('copy'));
      ta.remove();
    } catch (e) { done(false); }
  });
});
</script>
</body>
</html>
`;

// markdown 裡寫 <!--INCLUDE:檔名--> 就把 docs/ 底下那個檔整份嵌進來。
//
// **為什麼要嵌，不給下載連結。** 創作者要對那份腳本做的事是「複製、貼到
// Apps Script 編輯器」——給他一個檔案連結，等於要他先下載、再找到檔案、
// 再用某個編輯器打開、再全選。而且 GitHub 帳號停權之後，原本那條相對連結
// 在網站上直接是 404（2026-09-07 撞到）。
//
// 嵌進來還有一個好處：**腳本與文件永遠是同一版**。分開放的話，改了腳本忘了
// 更新文件，就會有人照著舊的貼。
const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inlineIncludes = (html, docsDir) =>
  html.replace(/<!--INCLUDE:(.+?)-->/g, (_, name) => {
    const file = resolve(docsDir, name.trim());
    if (!existsSync(file)) return `<p><em>（找不到 ${name}）</em></p>`;
    const code = escapeHtml(readFileSync(file, 'utf8'));
    return `<div class="snippet">
<button class="copy" type="button" data-copy>複製整份</button>
<pre><code>${code}</code></pre>
</div>`;
  });

const render = (mdPath, title) => {
  const src = readFileSync(mdPath, 'utf8');
  let html = marked.parse(src, { mangle: false, headerIds: false });
  html = inlineIncludes(html, dirname(mdPath));
  // 表格包一層，讓它在手機上自己橫向捲，而不是把整頁撐寬
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>')
             .replace(/<\/table>/g, '</table></div>');
  return shell(title, html);
};

export const docsPages = () => ({
  name: 'misheng-docs-pages',

  // **dev 時每次請求現場算，不吃 public/ 裡那份。**
  //
  // buildStart 在 dev 只跑一次（伺服器啟動時），所以改了 markdown 之後畫面還是舊的
  // ——要重開 server 才看得到。實測時我自己踩過一次，Dong 也撞到（2026-09-07：
  // 「為什麼不能在 5205 看到最新的文件？」）。
  //
  // 那是同一種病的又一個病灶：**產物與來源之間有一個不會自動失效的快取。**
  // 這裡的解法是最徹底的那種——dev 根本不看快取，每次都從 .md 重算。
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = (req.url || '').split('?')[0];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // 不給快取：dev 時改一行 markdown 就該重整看得到
      res.setHeader('Cache-Control', 'no-store');

      if (path === '/docs' || path === '/docs/' || path === '/docs/index.html') {
        res.end(shell('文件', indexHtml()));
        return;
      }
      const page = PAGES.find(
        (p) => path === `/docs/${p.slug}` || path === `/docs/${p.slug}.html`
      );
      if (!page) return next();
      const mdPath = resolve(root, 'docs', page.md);
      if (!existsSync(mdPath)) return next();
      res.end(render(mdPath, page.title));
    });
  },

  // buildStart 而不是 closeBundle：產出要放進 public/，而 public/ 是在 build
  // 過程中被複製到 dist/ 的——晚一步就進不去那一班車
  buildStart() {
    const outDir = resolve(root, 'public', 'docs');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    for (const page of PAGES) {
      const mdPath = resolve(root, 'docs', page.md);
      if (!existsSync(mdPath)) {
        // 文件被改名或刪掉時要吵一聲。安靜跳過的話，網站上那條連結會變成 404，
        // 而那正是這個 plugin 要解決的問題
        this.warn(`docs/${page.md} 不存在，/docs/${page.slug} 不會被產生`);
        continue;
      }
      writeFileSync(resolve(outDir, `${page.slug}.html`), render(mdPath, page.title));
    }
    writeFileSync(resolve(outDir, 'index.html'), shell('文件', indexHtml()));
    console.log(`\n  public/docs/  ${PAGES.length + 1} 頁`);
  },
});

export const DOC_URLS = Object.fromEntries(
  PAGES.map((p) => [p.slug, `https://misheng.app/docs/${p.slug}`])
);
