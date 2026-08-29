import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// ── 依賴方向規則（2026-08-29，COO-156）────────────────────────────────
//
// src/ 分四層，只能往下依賴：
//
//   site  ─┐
//          ├─→ player ──→ shared
//   studio ┘
//
// 為什麼要用 lint 擋，而不是寫在文件裡：**沒有執行機制的規則會退化成「想到才做」。**
// 實證就在這條規則誕生的原因裡——`shared/theme.js` 曾經 import `studio/flowLayout`
// 的色票，那條反向依賴在 repo 裡活了一個月沒有人發現，因為它的入口是「配色」。
//
// 為什麼 `player` 這一層特別重要：它是**唯一會被單獨 build 出去交給使用者的一層**
// （產品線 2：解壓即用的播放器）。它一旦 import 了 studio 的東西，那個東西就會被
// 打包進使用者的 zip——而且沒有人會知道。
//
// `studio → player` 是**允許且刻意的**：`/create` 的全部價值就是把真的遊戲
// render 在自己裡面（`sidePanel` 必須掛在 `GameProvider` 內）。那不是意外的耦合。
const layerRule = (forbidden, message) => ({
  'no-restricted-imports': [
    'error',
    { patterns: [{ group: forbidden, message }] },
  ],
})

const layerBoundaries = [
  {
    files: ['src/player/**/*.{js,jsx}'],
    rules: layerRule(
      ['**/studio/**', '**/site/**'],
      'player 是要單獨 build 給使用者的那一層，不得依賴 studio（/create 工具）或 site（官網）。需要共用就往 shared/ 放。'
    ),
  },
  {
    files: ['src/shared/**/*.{js,jsx}'],
    rules: layerRule(
      ['**/player/**', '**/studio/**', '**/site/**'],
      'shared 是最底層，不能知道自己被誰用。要用到上層的東西，代表那個東西應該搬進 shared。'
    ),
  },
  {
    files: ['src/site/**/*.{js,jsx}'],
    rules: layerRule(
      ['**/player/**', '**/studio/**'],
      '官網是靜態的介紹頁，不該把遊戲引擎或 /create 工具拖進它的 bundle。'
    ),
  },
]


export default [
  // build 產物不是原始碼。原本只擋 dist，於是 `vercel build` 留下的
  // .vercel/output/ 被當成專案的一部分在 lint——233 個 error 全來自那裡。
  // 這件事讓 `npm run lint` 長期是紅的，而**一條紅了很久的 lint 等於沒有 lint**：
  // 真正該擋下來的新錯誤會淹沒在噪音裡（本檔底下那組依賴方向規則正是靠它把關）。
  { ignores: ['dist', 'dist-ssr', '.vercel', 'src/gameFile'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // CLI 腳本跑在 Node，不是瀏覽器——沒有這塊的話 process / console 全部 no-undef
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  ...layerBoundaries,
]
