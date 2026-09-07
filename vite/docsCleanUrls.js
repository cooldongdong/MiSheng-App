import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// dev 時讓 /docs/xxx 也走得到 public/docs/xxx.html。
//
// **為什麼需要它。** 線上有 vercel.json 的 cleanUrls，所以 /docs/sheet/rundown
// 直接可以開；但 vite dev 只照實際檔名供應 public/ 底下的東西，沒有 .html 就
// 掉進 SPA 的 index.html——畫面上看到的是官網首頁，看起來像文件不見了
//（Dong 2026-09-07：「我在 5205/docs 頁面看不到」）。
//
// 我原本的回答是「dev 請改用 npm run docs:dev」。那是把我的建置細節推給使用者
// ——他要看的是文件長什麼樣，不是記住兩個 server 的分工。**兩邊行為一致比較重要。**
//
// 注意這一層只補「網址對應到檔案」。VitePress 的 HMR 仍然只有 docs:dev 才有，
// 所以改 markdown 之後要重跑 build:docs 才會在 5205 看到新的。
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const docsCleanUrls = () => ({
  name: 'misheng-docs-clean-urls',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path] = (req.url || '').split('?');
      if (!path.startsWith('/docs')) return next();
      if (/\.[a-z0-9]+$/i.test(path)) return next(); // 已經有副檔名（.html/.css/.js）

      const base = resolve(root, 'public', `.${path}`.replace(/^\.\//, ''));
      const candidates =
        path === '/docs' || path === '/docs/'
          ? [resolve(root, 'public/docs/index.html')]
          : [`${base}.html`, resolve(base, 'index.html')];

      const hit = candidates.find((f) => existsSync(f));
      if (hit) req.url = `/${hit.slice(resolve(root, 'public').length + 1)}`;
      next();
    });
  },
});
