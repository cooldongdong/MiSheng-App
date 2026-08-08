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

## ⚠️ demo 遊戲是 submodule，不是這個 repo 的檔案

`src/gameFile/demo` 是指向獨立 repo [MiSheng-demo-game](https://github.com/cooldongdong/MiSheng-demo-game)
的 git submodule。`.gitignore` 仍排除 `src/gameFile/*`（自己的遊戲不進 repo），
只對 `demo` 開例外。

**clone 一定要帶 `--recurse-submodules`，否則 `/demo` 會是空白的**：

```bash
git clone --recurse-submodules https://github.com/rr37/MiSheng-App.git
# 已經 clone 了才想起來：
git submodule update --init
```

分兩個 repo 不是為了好玩，是**授權邊界**：App 是 GPL-3.0，demo 遊戲的圖與
CSV 是 CC BY-NC 4.0。混進同一個 repo 會把兩套條款攪在一起。

**demo 遊戲改了之後**，要回到這個 repo 更新指標，否則線上還是舊版：

```bash
git submodule update --remote src/gameFile/demo
git commit -am "chore: bump demo game submodule"
```

> submodule 最常見的失敗不是壞掉，是**忘記做上面這步**——遊戲明明改了，
> 線上卻沒變。症狀是「沒反應」而不是報錯，所以會找很久。

## 授權

GPL-3.0。
