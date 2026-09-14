// 匯出時把圖片縮小。**唯一不可退讓的是：有透明度的圖，出來還是有透明度。**
//
// ── 為什麼不走 Drive 的 sz 參數 ─────────────────────────────
// 票上原本寫「Drive 外連圖帶 sz=w2000 就好，Google 幫你縮，一行程式都不用寫」。
// 那個判斷在這裡要推翻：`drive.google.com/thumbnail` **會決定自己要回什麼格式**，
// 而 2026-07-22 實測它回的是 `image/jpeg`——JPEG 沒有 alpha 通道。
// 去背的立繪、`type=Overlay` 的數位透明片一旦走那條路，透明度就沒了，
// 而症狀是「透明片變成一塊黑布」，只有那一關會壞。
//
// 所以一律下載原圖、自己用 canvas 壓：**不依賴任何外部服務對格式的決定**。
// 代價是頻寬（本來就要下載），換到的是格式完全可控。
//
// ── 格式怎麼決定 ────────────────────────────────────────
// 不看副檔名（PNG 不一定有透明），**看縮圖後實際的 alpha 通道**：
//
//   有 alpha → PNG（保住透明度）
//   沒 alpha → JPEG（照片壓得動，去背圖本來就不會走到這裡）
//
// 掃描放在「縮小之後」做：原圖 4000×3000 要掃 4800 萬個位元組，縮到 1600 之後
// 只剩八分之一，而透明的區域縮小之後仍然是透明的（插值只會讓邊緣更柔，不會變不透明）。
//
// **刻意不用 WebP。** 它有 alpha 又壓得更小，但 iOS 14 以下不支援——而失敗的樣子
// 是「圖直接不見」。實境解謎的玩家手機參差，這個交換不划算。

// 兩級上限，依這張圖在遊戲裡會被怎麼看：
//
//   背景／立繪／頭像：滿版顯示但**不能放大**，螢幕寬 430 × dpr 3 ≒ 1290，1600 綽綽有餘
//   道具／提示／故事：`ZoomableImage` 可以放大到 5 倍，玩家會湊近看碑文與細節
export const WIDTH_LIMITS = { display: 1600, zoomable: 2400 };

// 高度上限給寬度上限的兩倍。9:16 的背景圖（1080×1920）高是寬的 1.78 倍，
// 不能卡到它；但**卷軸式的長圖**（例如 800×5000 的碑文全文照）寬度沒超標、
// 高度卻爆掉，那種圖不處理的話會整張原樣進包。
const HEIGHT_MULTIPLIER = 2;

// 即使尺寸夠小，超過這個大小仍然值得進 canvas 看看。
// 典型是「照片存成無壓縮 PNG」：1500×1000 可能有 8 MB，而轉成 JPEG 只要 200 KB。
// **原本的「已經夠小」只看寬度，於是這種圖完全不會被碰**——而它正是壓縮效益
// 最大的一種（Dong 2026-09-14 問「壓縮的條件是什麼」時盤出來的）。
const BYTES_THRESHOLD = 1024 * 1024;

// 這張圖需不需要處理。三個條件任一成立就要進 canvas。
export const needsWork = ({ width, height, size, limit }) =>
  width > limit ||
  height > limit * HEIGHT_MULTIPLIER ||
  size > BYTES_THRESHOLD;

// 哪些欄位的圖會被玩家放大。判準是「它有沒有掛在 ZoomableImage 上」，
// 不是「它看起來重不重要」。
const ZOOMABLE = {
  prop: ['img', 'backImg', 'frontImg', 'rotateImg1', 'rotateImg2'],
  hint: ['img'],
  story: ['img'],
};

export const limitFor = (table, column) =>
  ZOOMABLE[table]?.includes(column) ? WIDTH_LIMITS.zoomable : WIDTH_LIMITS.display;

// 一張圖可能被好幾個地方用到（同一個網址填在不同格）。
// **取最寬鬆的那一個**——被放大的那個用途說了算，否則會為了省幾 KB 把碑文壓糊。
export const limitForUses = (uses = []) =>
  uses.reduce((max, u) => Math.max(max, limitFor(u.table, u.column)), 0) ||
  WIDTH_LIMITS.display;

// 壓完比原檔還大就不要換。小圖重新編碼常常變大，而「壓縮」讓檔案變大是最沒道理的結果。
export const keepOriginal = ({ originalSize, newSize, originalWidth, limit }) => {
  if (!newSize) return true; // 編碼失敗
  if (originalWidth && originalWidth <= limit && newSize >= originalSize) return true;
  return newSize >= originalSize;
};

// 看**檔頭**認格式，不看副檔名也不看伺服器給的 MIME。
//
// 兩者都會騙人：創作者可能把 png 存成 .jpg，Drive 也可能回一個跟內容不符的
// Content-Type。而這裡認錯的代價是把動畫 GIF 壓成單張、或把向量圖點陣化——
// 兩種都是「東西還在但變質了」，不會報錯。
const sniff = (bytes) => {
  const b = bytes;
  if (b.length < 12) return 'unknown';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'webp';
  // SVG／XML：開頭可能有 BOM 或空白，掃前面幾個位元組找 '<'
  for (let i = 0; i < Math.min(64, b.length); i += 1) {
    if (b[i] === 0x3c) return 'svg';
    if (b[i] > 0x20) break;
  }
  return 'unknown';
};

// 不碰的格式。**SVG 是向量**（縮它沒有意義，而且 canvas 會把它點陣化）；
// **GIF 可能是動畫**，畫進 canvas 只會留下第一格——那種壞法是「動畫不見了」，
// 沒有人會聯想到是匯出造成的。
const SKIP_KINDS = new Set(['svg', 'gif', 'unknown']);

// 縮圖後掃 alpha 通道。**不看副檔名**——PNG 不一定有透明，而猜錯的代價是把
// 去背的立繪、數位透明片壓成一塊黑底。
//
// 放在縮圖後掃：原圖 4000×3000 要走 4800 萬個位元組，縮到 1600 之後只剩八分之一。
// 透明的區域縮小之後仍然是透明的（雙線性插值只會讓邊緣更柔，不會把 alpha 變回 255）。
const hasAlpha = (ctx, w, h) => {
  const { data } = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
};

const toBlob = (canvas, mime, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, mime, quality));

/**
 * 把一張圖縮到 limit 寬以內。回傳 { bytes, mime, width, height, note }。
 * **任何一種不確定的情況都回原檔**——壓縮是加分，弄壞圖片不是。
 */
export const compressBytes = async (bytes, limit) => {
  const kind = sniff(bytes);
  const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }[kind] || '';
  const original = { bytes, mime, width: 0, height: 0, note: '', changed: false };
  if (SKIP_KINDS.has(kind)) {
    return { ...original, note: kind === 'unknown' ? '認不出格式，保留原檔' : '向量或動畫，未壓縮' };
  }

  let bitmap;
  try {
    // **imageOrientation: 'from-image' 不能省。** 手機拍的照片常帶 EXIF 旋轉，
    // 而 <img> 顯示時瀏覽器會套用它、createImageBitmap 預設**不會**——
    // 少了這個參數，壓完的照片會整張倒過來，而原圖看起來是好的。
    bitmap = await createImageBitmap(new Blob([bytes], { type: mime }), {
      imageOrientation: 'from-image',
    });
  } catch {
    return { ...original, note: '讀不出這張圖，保留原檔' };
  }

  const { width, height } = bitmap;
  original.width = width;
  original.height = height;

  // 三個條件都不成立才算「已經夠小」，那時完全不碰——重新編碼只會損失畫質，
  // 而且這條路順便保證了小的透明圖連 canvas 都不會經過。
  if (!needsWork({ width, height, size: bytes.length, limit })) {
    bitmap.close?.();
    return { ...original, note: '已經夠小' };
  }

  // **兩個方向都要夾。** 只縮寬度的話，長圖（寬度本來就沒超標）不會被縮到，
  // 而它的像素量可能比一張超寬的圖還多。
  const scale = Math.min(1, limit / width, (limit * HEIGHT_MULTIPLIER) / height);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const alpha = hasAlpha(ctx, w, h);
  const outMime = alpha ? 'image/png' : 'image/jpeg';
  const blob = await toBlob(canvas, outMime, alpha ? undefined : 0.85);
  const newBytes = blob ? new Uint8Array(await blob.arrayBuffer()) : null;

  if (
    keepOriginal({
      originalSize: bytes.length,
      newSize: newBytes?.length || 0,
      originalWidth: width,
      limit,
    })
  ) {
    return { ...original, note: alpha ? '壓縮後反而更大（透明圖），保留原檔' : '壓縮後反而更大，保留原檔' };
  }

  return {
    bytes: newBytes,
    mime: outMime,
    width: w,
    height: h,
    // changed＝副檔名要不要跟著改。有 alpha 時輸出 PNG，來源本來就是 PNG／WebP，
    // 但 WebP→PNG 仍然算變了。
    changed: outMime !== mime,
    note:
      w === width && h === height
        ? `尺寸不變，重新編碼${alpha ? '（保留透明度）' : ''}`
        : `${width}×${height} → ${w}×${h}${alpha ? '，保留透明度' : ''}`,
  };
};
