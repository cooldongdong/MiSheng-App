# MiSheng 謎生

把 CSV（Google Sheet）轉成實境解謎遊戲網頁的產生器。React + Vite。

## 指令

```bash
npm run dev        # 開發伺服器（vite）
npm run build      # 建置
npm run preview    # 預覽建置產物
npm run lint       # eslint
npm run validate   # 驗證遊戲資料（scripts/validate.js）
```

## 三個入口

Vite 多入口，`vercel.json` 的 `cleanUrls` 讓網址免去 `.html`：

| 網址 | 檔案 | 用途 |
|---|---|---|
| `/` | `index.html` | 官網首頁 |
| `/demo` | `demo.html` | 多列宇宙 demo |
| `/create` | `create.html` | 即時轉化 |

## 資料如何進入遊戲：兩條路徑

**build-time（`/demo`）** — 遊戲資料在建置時就打包進 bundle：

```
src/gameFile/{game}/*.csv
  ↓ gameLoader.js       Vite import.meta.glob('../gameFile/*/*.csv')，建置時掃描
  ↓ csvLoader.js        papaparse，header: true
  ↓ GameController.jsx  跑遊戲
```

新增一個遊戲 ＝ 丟資料夾進 `src/gameFile/` → rebuild。

**runtime（`/create` 即時轉化）** — 不經過建置：

```
使用者貼 Google Sheet 公開連結
  ↓ 瀏覽器 fetch
  ↓ csvLoader.js        （與 build-time 共用）
  ↓ 在記憶體裡跑遊戲     重整就消失，不寫任何後端
```

`csvLoader` 兩條路共用，`gameLoader` 只用於 build-time 那條。

## validator 是 `/create` 的前置守門員

`scripts/validate.js` 不是獨立功能——它的 schema 定義與驗證邏輯被 `/create` 直接重用。
使用者貼了有問題的 sheet 時，validator 先擋下並指出**哪張表哪一格**錯，
而不是丟一個白畫面。改動資料模型時兩邊要一起看。

## ⚠️ `src/gameFile/` 不在這個 repo 裡

`.gitignore` 刻意排除 `src/gameFile/*`（只留 `.gitkeep`）。

**所以乾淨 clone 之後 `/demo` 會是空的**——demo 用的 CSV 與圖片不在這裡，
它們的家是獨立 repo `MiSheng-demo-game`。要在本機看 demo，得自己準備
`src/gameFile/{game}/` 的資料。

## 授權

GPL-3.0。
