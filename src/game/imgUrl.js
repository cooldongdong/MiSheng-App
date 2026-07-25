// imgUrl.js
// 把「表格裡填的圖片欄位」正規化成瀏覽器可以直接 <img src> 的網址。
//
// 用途：build-time 遊戲（src/gameFile/）的圖片是本機檔名，走 game-provider 的 IMAGE_MAP；
// 即時轉化（/create）的遊戲沒有本機檔案，只能填外連網址，由這裡負責解析。
//
// 支援的填法：
//   1. 任何 http(s) 圖片直連（GitHub raw、Imgur、自架…）→ 原樣使用
//   2. Google Drive 分享連結（檔案需設為「知道連結的任何人」）→ 轉成 thumbnail 直連
//        https://drive.google.com/file/d/<ID>/view?usp=sharing
//        https://drive.google.com/open?id=<ID>
//        https://drive.google.com/uc?export=view&id=<ID>   （此舊格式本身已失效，會被轉掉）
//      → https://drive.google.com/thumbnail?id=<ID>&sz=w<寬>
//        （會 302 到 lh3.googleusercontent.com，回 image/*，且 CORS 為 *）

// Drive 檔案 id 的長相：英數、底線、減號，長度不定（通常 25+）
const DRIVE_ID = '([a-zA-Z0-9_-]{10,})';

const DRIVE_PATTERNS = [
  new RegExp(`drive\\.google\\.com/file/d/${DRIVE_ID}`),
  new RegExp(`drive\\.google\\.com/(?:open|uc|thumbnail)\\?[^\\s]*[?&]?id=${DRIVE_ID}`),
  new RegExp(`lh3\\.googleusercontent\\.com/d/${DRIVE_ID}`),
];

// 預設要多寬的圖。實境解謎是手機直式，1600 對滿版底圖夠用又不會太肥。
const DEFAULT_WIDTH = 1600;

export const extractDriveId = (url) => {
  for (const re of DRIVE_PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
};

export const driveImgUrl = (id, width = DEFAULT_WIDTH) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;

// 不是外連網址就回 null（代表「這是本機檔名，交給 IMAGE_MAP」）
export const resolveExternalImg = (value, width = DEFAULT_WIDTH) => {
  if (!value) return null;
  const url = String(value).trim();
  if (!/^https?:\/\//i.test(url)) return null;

  const driveId = extractDriveId(url);
  if (driveId) return driveImgUrl(driveId, width);

  return url;
};
