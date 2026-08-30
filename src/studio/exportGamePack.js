// exportGamePack.js
// 把「試算表 ＋ 外連圖片」的遊戲，打包成一份可以自己部署的資料夾。
//
// 解決的問題：表格裡的圖片欄位同時在講兩件事——「這是哪張圖」和「這張圖住在哪」。
// 填 Drive 連結時身分被位置吃掉了，所以要搬去 src/gameFile/ 自架時，
// 每一格都得手動換成檔名。這支程式把圖抓下來、生檔名、順手改寫那一格。
//
// 產出（zip）：
//   {遊戲}/xxx.csv        7 張表，圖片欄位已改寫成檔名
//   {遊戲}/img/*          抓下來的圖
//   {遊戲}/圖片對照.csv    收據：檔名 ↔ 原始連結 ↔ 用在哪
//
// ── 為什麼有「收據」這張表 ────────────────────────────────
// 原檔名拿不到。Drive 回應裡其實有 `content-disposition: inline;filename="…"`，
// 但 `access-control-expose-headers` 只放行 Content-Length，所以瀏覽器把它藏起來，
// JS 讀到的是 null（2026-08-25 實測）。檔名只能自己生，於是生出來的名字跟你
// 本機那份原圖對不起來——收據就是用來對回去的。
//
// ── 為什麼不走 drive.google.com/thumbnail ─────────────────
// 因為 fetch 會死。thumbnail 會 302 到 lh3，而「那個 302 回應本身」沒有帶
// access-control-allow-origin（只有最後落地的 lh3 有）。CORS 要求重導向的每一跳
// 都放行，所以整條 fetch 在第一跳就被擋下來（實測：TypeError: Failed to fetch）。
// 遊戲畫面沒事是因為 <img> 根本不做 CORS——同一條網址，<img> 能用、fetch 不能用。
// 所以這裡直接打 lh3。
//
// ── 為什麼不帶 size 參數 ──────────────────────────────────
// imgUrl.js 給畫面用的是 `sz=w1600`（夠用又不肥）。但那個參數是真的會縮的
// （實測 =w800 → 800px），代表原圖若寬於 1600 就會拿到壓過的版本。
// 匯出是要留著自架的檔案，所以不帶參數，拿最大的那一份。

import Papa from 'papaparse';
import { zip, unzip } from 'fflate';
import { IMG_FIELDS } from './checkSheetImages';
import { extractDriveId } from '../player/game/imgUrl';

// 一次最多幾條連線。Drive 對同時大量請求會變慢甚至擋，慢慢來比較快。
const CONCURRENCY = 4;
// 單張圖的上限，避免一張壞掉的圖把整個匯出卡住
const FETCH_TIMEOUT_MS = 30000;
// 429／5xx 的重試次數與起始等待。Drive 真的會限速——實測連抓同一張圖就吃到 429。
// 不重試的話，圖多的遊戲會匯出成「隨機缺幾張」，而那種壞法要到 build 完才看得出來。
const MAX_RETRY = 3;
const RETRY_BASE_MS = 1000;

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
};

// 遊戲資料在包裡的位置。播放器開機後就是去讀這個資料夾——
// 名字改了播放器就找不到，所以它與 runtimeGame.js 的 RUNTIME_GAME_DIR 必須一致。
const GAME_DIR = 'game';
const PLAYER_ZIP = 'player.zip';
const README_NAME = '怎麼把這個遊戲放上網.txt';

// build 時產生的播放器（見 vite.player.config.js）。
// 用 new URL 而不是寫死 '/player.zip'：/create 現在住在網站根目錄，但這條路徑
// 不該預設它永遠在那裡。
const fetchPlayer = async () => {
  try {
    const res = await fetch(new URL(PLAYER_ZIP, window.location.origin).href);
    if (!res.ok) throw new Error(`伺服器回 ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const files = await new Promise((resolve, reject) =>
      unzip(bytes, (err, out) => (err ? reject(err) : resolve(out)))
    );
    return { ok: true, files, error: '' };
  } catch (e) {
    // 播放器拿不到不該讓整包匯出失敗——使用者的資料是他的，一定要給他
    return { ok: false, files: {}, error: e.message || String(e) };
  }
};

// 寫給「把資料夾丟上去的那個人」，不是寫給工程師。
// 純文字不是 markdown：這個檔案會被雙擊打開，而 .md 在多數人的電腦上會跳出
// 一個問「要用什麼開」的對話框。
const readme = (folder, playable) => `這是「${folder}」的遊戲包。

${
  playable
    ? `1. 把這個資料夾整個解壓縮
【最快的一條路：Cloudflare】

1. 登入 https://dash.cloudflare.com
2. 找到 Workers & Pages
3. Create application → Upload your static files
4. 把這個 zip 直接拖上去（不用解壓縮）
5. 點 Visit，就可以玩了

不需要安裝任何軟體，也不用會寫程式。

其他選擇與注意事項（GitHub Pages 有一個對解謎很要命的限制）看這裡：
https://github.com/cooldongdong/MiSheng-App/blob/main/docs/自己部署遊戲.md

【注意】不能直接用瀏覽器打開 index.html（網址開頭是 file:// 的那種）。
瀏覽器不允許網頁那樣讀資料，畫面會告訴你讀不到遊戲。一定要放上網站空間。
`
    : `【這一包只有資料，沒有播放器】

匯出的時候抓不到播放器，所以裡面只有你的 ${GAME_DIR}/ 資料夾。
資料是完整的，重新匯出一次通常就會有播放器了。
`
}
【裡面有什麼】

  ${GAME_DIR}/            你的遊戲。7 張 CSV ＋ img/ 圖片
                    改完直接重新上傳就生效，不用重新匯出
  圖片對照.csv       哪個檔名對應原本哪一條連結、用在哪一格
${playable ? '  index.html      播放器。不用改它\n  assets/         播放器的程式碼\n' : ''}
【授權】

播放器的原始碼是 AGPL-3.0，公開在
https://github.com/cooldongdong/MiSheng-App

你的遊戲內容是你自己的——CSV、圖片、謎題都不受這個授權影響。
只有「你改了播放器的程式碼、又讓別人透過網路用」時，才要一併公開你改過的版本。
`;

// CSV 是給人看的第 2 列開始＝資料第 1 列（第 1 列是表頭）
const sheetRow = (i) => i + 2;

// 檔名只留 ASCII 安全字元：這些檔名會進 Vite 的 import.meta.glob 和各種檔案系統，
// 中文與空白在那條路上不是不能用，只是每多一種就多一個會壞掉的地方。
const safeName = (s) =>
  String(s ?? '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'x';

/**
 * 表格裡的一格 → 「可以拿去 fetch 的網址」。
 * 回 null 代表這格不是外連網址（已經是檔名了，匯出時原封不動）。
 */
export const toFetchableUrl = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!/^https?:\/\//i.test(raw)) return null;

  const driveId = extractDriveId(raw);
  // 不帶 =w 參數＝要原圖；也順便把四種 Drive 寫法收斂成同一條，好去重
  if (driveId) return `https://lh3.googleusercontent.com/d/${driveId}`;

  return raw;
};

// 表格填檔名時，那一格本來就是對的，不必改寫——要做的是把那個檔案放進包裡。
// 路徑沿用 build-time 的慣例：值是相對於 {遊戲}/img/ 的路徑。
const normalizeLocalPath = (v) => String(v).trim().replace(/^\/+/, '');

/**
 * 掃過 7 張表的所有圖片欄位，分成兩種：
 *   remote —— 值是網址，要下載、生檔名、改寫那一格
 *   local  —— 值是檔名，原樣保留，只要把本機資料夾裡那個檔案打包進去
 *
 * 兩種都會去重（同一張圖被用在很多格是常態），也都會記下「用在哪幾格」。
 * local 找不到對應檔案時仍然收進來，帶著 blobUrl=null——因為「包裡少一張圖」
 * 正是這份報告最該講的事，靜靜跳過等於讓人拿到一包會缺圖的東西。
 */
export const collectImageRefs = (tables, imgMap = null) => {
  const refs = new Map();

  const add = (key, make, use) => {
    if (!refs.has(key)) refs.set(key, { ...make(), uses: [] });
    refs.get(key).uses.push(use);
  };

  for (const [table, columns] of Object.entries(IMG_FIELDS)) {
    const rows = tables[table]?.rows || [];
    for (const column of columns) {
      rows.forEach((row, rowIndex) => {
        if (!row) return;
        const original = row[column];
        if (!original || !String(original).trim()) return;
        const use = { table, column, rowIndex, id: row.id };

        const fetchUrl = toFetchableUrl(original);
        if (fetchUrl) {
          add(`remote:${fetchUrl}`, () => ({
            kind: 'remote',
            fetchUrl,
            original: String(original).trim(),
          }), use);
          return;
        }

        const path = normalizeLocalPath(original);
        // imgMap 同時收 basename 與相對路徑，兩種填法都對得到（見 localFiles.js）
        const blobUrl = imgMap?.get(path) ?? imgMap?.get(path.split('/').pop()) ?? null;
        add(`local:${path}`, () => ({
          kind: 'local',
          path,
          blobUrl,
          original: path,
        }), use);
      });
    }
  }

  return [...refs.values()];
};

// 檔名取自「第一個用到它的地方」：{表}-{id}-{欄位}.{副檔名}
// 用 id 而不是列號，因為列號會隨著使用者插入／刪除列而變，id 不會。
const baseNameFor = (ref) => {
  const first = ref.uses[0];
  const id = first.id === undefined || first.id === '' ? `r${sheetRow(first.rowIndex)}` : first.id;
  return safeName(`${first.table}-${id}-${first.column}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 值得再試一次的：被限速，或對面暫時掛了。4xx（除了 429）重試沒有意義。
const isTransient = (status) => status === 429 || status >= 500;

const fetchOnce = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.retryAfter = Number(res.headers.get('retry-after')) || 0;
      throw err;
    }

    const blob = await res.blob();
    const mime = (blob.type || '').split(';')[0].toLowerCase();

    // 權限沒開時 Google 不回 4xx，而是回一頁 HTML——不擋的話會存出一個
    // 副檔名是圖、內容是登入頁的檔案，而且要到 build 之後才會發現
    if (mime && !mime.startsWith('image/')) {
      throw new Error(
        mime.includes('html')
          ? '拿到的不是圖片（多半是這個檔案沒有設成「知道連結的任何人」）'
          : `拿到的不是圖片（${mime}）`
      );
    }
    if (!blob.size) throw new Error('檔案是空的');

    // 直接轉成 bytes：fflate 吃 Uint8Array，Blob 它不認得
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { bytes, ext: EXT_BY_MIME[mime] || 'img' };
  } finally {
    clearTimeout(timer);
  }
};

const fetchImage = async (url) => {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt += 1) {
    try {
      return await fetchOnce(url);
    } catch (err) {
      lastErr = err;
      // 逾時與「拿到的不是圖片」重試也沒用，直接放棄
      if (!isTransient(err.status)) throw err;
      if (attempt === MAX_RETRY) break;
      // 對方有講要等多久就聽它的，否則指數退避
      const wait = err.retryAfter ? err.retryAfter * 1000 : RETRY_BASE_MS * 2 ** attempt;
      await sleep(wait);
    }
  }
  throw new Error(`${lastErr.message}（重試 ${MAX_RETRY} 次仍失敗，多半是 Google 在限速，等一下再匯出）`);
};

// 簡單的併發池：CONCURRENCY 個 worker 輪流從同一個 index 取工作
const runPool = async (items, size, worker) => {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
};

const zipAsync = (files) =>
  new Promise((resolve, reject) => {
    zip(files, (err, data) => (err ? reject(err) : resolve(data)));
  });

const utf8 = (s) => new TextEncoder().encode(s);

/**
 * 主流程。
 *
 * @param tables      { [type]: { fields, rows } }
 * @param imgMap      本機圖片資料夾對照表（沒選資料夾時為 null）
 * @param onProgress  ({ done, total, label }) => void
 * @returns { blob, folder, report }
 */
export const buildGamePack = async (tables, { imgMap = null, onProgress } = {}) => {
  const refs = collectImageRefs(tables, imgMap);
  const total = refs.length;
  let done = 0;

  // 只有外連圖片要生檔名（本機那條路值本來就是檔名，原樣沿用）。
  // 理論上 {表}-{id}-{欄位} 就唯一了，但 id 經過 safeName 之後可能撞
  // （例如 id 是「關卡 1」和「關卡-1」），所以還是擋一下。
  const used = new Set();
  const results = refs.map((ref) => {
    if (ref.kind !== 'remote') {
      return { ref, base: null, fileName: null, packPath: `img/${ref.path}`, bytes: null, error: null };
    }
    let base = baseNameFor(ref);
    if (used.has(base)) {
      let n = 2;
      while (used.has(`${base}-${n}`)) n += 1;
      base = `${base}-${n}`;
    }
    used.add(base);
    return { ref, base, fileName: null, packPath: null, bytes: null, error: null };
  });

  await runPool(results, CONCURRENCY, async (item) => {
    try {
      if (item.ref.kind === 'remote') {
        const { bytes, ext } = await fetchImage(item.ref.fetchUrl);
        item.bytes = bytes;
        item.fileName = `${item.base}.${ext}`;
        item.packPath = `img/${item.fileName}`;
      } else if (item.ref.blobUrl) {
        // 本機圖：blob: 網址讀回 bytes，檔名與那一格的值都不動
        const res = await fetch(item.ref.blobUrl);
        item.bytes = new Uint8Array(await res.arrayBuffer());
      } else {
        throw new Error(
          imgMap
            ? '這張圖在你選的資料夾裡找不到（檔名要一模一樣，含大小寫與副檔名）'
            : '這格填的是檔名不是網址，而你沒有選本機圖片資料夾，所以這張圖沒有進到包裡'
        );
      }
    } catch (err) {
      // 單張失敗不擋整包：外連的那一格照舊留原連結，本機的那一格本來就沒動
      item.error = err.name === 'AbortError' ? '逾時（超過 30 秒）' : err.message || String(err);
    } finally {
      done += 1;
      onProgress?.({ done, total, label: item.base || item.ref.path });
    }
  });

  // 只有外連圖片要改寫那一格；本機那條路的值本來就對
  const rewrite = new Map(); // `${table}|${rowIndex}|${column}` -> fileName
  results.forEach((item) => {
    if (item.ref.kind !== 'remote' || !item.fileName) return;
    item.ref.uses.forEach((u) => {
      rewrite.set(`${u.table}|${u.rowIndex}|${u.column}`, item.fileName);
    });
  });

  // 重新輸出 7 張表。用 fields 保住欄位順序——Papa 從 row 物件推的順序
  // 只反映第一列有哪些 key，欄位在某些列是空的就會被排到別的位置去。
  const folder = safeName(tables.config?.rows?.[0]?.id || 'game');
  const files = {};

  for (const [table, { fields, rows }] of Object.entries(tables)) {
    const columns = IMG_FIELDS[table] || [];
    const nextRows = rows.map((row, rowIndex) => {
      if (!row) return row;
      let out = row;
      columns.forEach((column) => {
        const name = rewrite.get(`${table}|${rowIndex}|${column}`);
        if (!name) return;
        if (out === row) out = { ...row }; // 沒改到的列不複製，維持原物件
        out[column] = name;
      });
      return out;
    });

    const csv = Papa.unparse({ fields: fields || [], data: nextRows });
    files[`${folder}/${GAME_DIR}/${table}.csv`] = [utf8(csv), { level: 6 }];
  }

  results.forEach((item) => {
    if (!item.bytes) return;
    // 圖片本來就是壓縮格式了，再壓一次只是白花時間
    files[`${folder}/${GAME_DIR}/${item.packPath}`] = [item.bytes, { level: 0 }];
  });

  const whereOf = (ref) =>
    ref.uses.map((u) => `${u.table}.${u.column} 第 ${sheetRow(u.rowIndex)} 列`).join('、');

  // 收據。本機那條路其實不需要對照（檔名沒變），但一起列出來才回答得了
  // 「這包東西齊不齊」——那才是使用者真正要問的問題。
  const reportRows = results.map((item) => ({
    包裡的檔案: item.bytes ? item.packPath : '（沒有）',
    來源: item.ref.kind === 'remote' ? '外連網址' : '本機資料夾',
    表格裡填的值: item.ref.original,
    用在哪: whereOf(item.ref),
    用了幾格: item.ref.uses.length,
    狀態: item.error
      ? `${item.error}${item.ref.kind === 'remote' ? '（表格裡維持原連結）' : ''}`
      : item.ref.kind === 'remote'
        ? '已下載，表格裡的網址已換成這個檔名'
        : '已從本機資料夾打包，表格裡的值沒有動',
  }));

  const receipt = Papa.unparse(reportRows);
  // BOM：這張表是給人用 Excel 開的，沒有 BOM 中文會變亂碼
  files[`${folder}/圖片對照.csv`] = [utf8(`\uFEFF${receipt}`), { level: 6 }];

  // 播放器：抓 build 時產生的 player.zip、解開、拌進來。
  // 抓不到就退回「只有資料」的包，並在回報裡說清楚——**這一步失敗不該讓整個匯出失敗**，
  // 使用者至少要拿得到自己的東西。
  const player = await fetchPlayer();
  for (const [path, bytes] of Object.entries(player.files)) {
    files[`${folder}/${path}`] = [bytes, { level: 6 }];
  }

  files[`${folder}/${README_NAME}`] = [utf8(readme(folder, player.ok)), { level: 6 }];

  const zipped = await zipAsync(files);

  const counted = (kind) => results.filter((r) => r.ref.kind === kind);

  return {
    blob: new Blob([zipped], { type: 'application/zip' }),
    folder,
    report: {
      playable: player.ok,
      playerError: player.error,
      total,
      ok: results.filter((r) => r.bytes).length,
      downloaded: counted('remote').filter((r) => r.bytes).length,
      fromFolder: counted('local').filter((r) => r.bytes).length,
      // 帶上「用在哪」：失敗訊息要能讓人直接走回試算表那一格，
      // 只給一條網址的話，使用者還得自己在七張表裡找它長在哪
      failed: results
        .filter((r) => r.error)
        .map((r) => ({
          url: r.ref.original,
          error: r.error,
          where: whereOf(r.ref),
        })),
      rows: reportRows,
    },
  };
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 立刻 revoke 會讓某些瀏覽器來不及開始下載
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
