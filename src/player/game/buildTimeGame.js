// buildTimeGame.js
// 打包時就把遊戲塞進 JS 的那條路——**只有 /demo 走這裡**。
//
// 這個檔案的兩個 `import.meta.glob` 會把 src/gameFile/ 底下的 CSV 與圖片
// 全部變成 bundle 的一部分。這對 /demo 是對的（多列宇宙就是要跟著站台一起出貨）。
//
// 為什麼一定要跟 runtimeGame.js 分成兩個檔：**因為 glob 在模組頂層，碰到就整包拉進來。**
// 2026-08-30 實測：獨立播放器只是 import 了同一個檔裡的 runtime 函式，
// 產出就變成 12MB——其中 11MB 是 demo 的圖。那不只是肥：
// **demo 遊戲是 CC BY-NC 4.0，App 是 AGPL-3.0**（當初拆成 submodule 就是為了這條線），
// 把它夾進每一個使用者自己部署的 zip 裡，是把授權邊界弄破了。
//
// 所以規則是：**這個檔案只能被 /demo 的入口鏈碰到。** 圖片查表不再由 provider 直接做，
// 而是 App.jsx 從這裡拿一個函式傳進去——誰要 build-time 的東西，誰自己去拿。

const fileModules = import.meta.glob('../../gameFile/*/*.csv', {
  eager: false,
  as: 'raw',
});

console.log('🔍 所有可載入的 CSV 檔案：', Object.keys(fileModules));

const fileMap = {};

for (const path in fileModules) {
  const match = path.match(/\/gameFile\/([^/]+)\/\1 - ([^.]+)\.csv$/);
  if (!match) {
    console.warn('❌ 不符合命名規則，略過：', path);
    continue;
  }

  const folder = match[1];
  const type = match[2];

  if (!fileMap[folder]) {
    fileMap[folder] = {};
  }

  fileMap[folder][type] = fileModules[path];

  console.log(`✅ 加入檔案：「${folder}」遊戲中的「${type}.csv」`, path);
}

export const getGameFolders = () => {
  console.log('📁 可用的遊戲資料夾：', Object.keys(fileMap));
  return Object.keys(fileMap);
};

export const loadGameData = async (folderName) => {
  const loaders = fileMap[folderName];
  if (!loaders) throw new Error(`❌ 找不到遊戲資料夾：「${folderName}」`);

  console.log(`📦 開始載入遊戲資料夾：「${folderName}」`);

  const data = await Promise.all([
    loaders.character?.(),
    loaders.hint?.(),
    loaders.mission?.(),
    loaders.prop?.(),
    loaders.rundown?.(),
    loaders.story?.(),
    loaders.config?.(),
  ]);

  console.log(`✅ 載入完成：「${folderName}」`);

  return {
    characterCsvFile: data[0],
    hintCsvFile: data[1],
    missionCsvFile: data[2],
    propCsvFile: data[3],
    rundownCsvFile: data[4],
    storyCsvFile: data[5],
    configCsvFile: data[6],
  };
};

// 在模組頂層把所有 img 檔一次攔進來（打包時會生成真實 URL）。
// 原本這段住在 game-provider.jsx，但那個檔是**每一條路**都會經過的
// ——包括獨立播放器，於是 demo 的 11MB 圖片跟著跑進使用者的 zip。
// 搬到這裡之後，只有 import 這個檔的人才會付那個代價。
const IMAGE_MAP = import.meta.glob(
  '/src/gameFile/**/img/**/*.{png,jpg,jpeg,webp,svg,gif}',
  { eager: true, as: 'url' }
);

/** build-time 遊戲的圖片查表。找不到回 null，交給呼叫端決定怎麼退化。 */
export const buildTimeImg = (gameFolder, relPath) => {
  if (!gameFolder || !relPath) return null;
  // 支援子資料夾：relPath 可傳 'bg2.png' 或 'character/a.png'
  const keyA = `/src/gameFile/${gameFolder}/img/${relPath}`;
  const keyB = `/src/gameFile/${gameFolder}/img/${String(relPath).replace(/^\/+/, '')}`;
  return IMAGE_MAP[keyA] ?? IMAGE_MAP[keyB] ?? null;
};
