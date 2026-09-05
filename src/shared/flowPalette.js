// flowPalette.js
// 流程圖的色票——**只有資料，沒有任何 import**。
//
// 為什麼它住在 shared/ 而不是跟 flowLayout（幾何）放在 studio/：
// `shared/theme.js` 要拿這幾組值攤進 MUI palette，而 theme 是三個入口共用的。
// 色票若留在 studio/，就會出現一條 shared → studio 的**反向依賴**——也就是說
// 遊戲引擎（player）會透過共用 theme 依賴到 `/create` 的流程圖模組。
//
// 那條線在 2026-08-27 深色模式那輪真的長出來過，而且沒有人發現，直到 8/29
// 畫依賴方向時才被抓到。入口是「配色」——沒有人會盯的地方。實務上 rollup
// 大概會 tree-shake 掉，成本可能是 0 bytes；重點是**沒有人知道它在那裡**。
//
// 也因為它零 import，`scripts/flowmap.js`（Node CLI）可以直接吃它，
// 不會把 MUI 的 createTheme 拖進命令列工具。

// 低明度彩虹：色相拉開才分得出來，明度壓低才不會有「AI 感」的亮藍紫
export const MODEL_COLOR = {
  MissionStart: '#2f3e46', // 章節錨點：深墨，實心底、白字
  // 封面與章節錨點同色：它們在圖上是同一種東西（一段的起點），
  // 給新色相等於在圖例上多一個要記的東西，而讀圖的人分不出「這兩顆有什麼不同」。
  GameStart: '#2f3e46',
  Talk: '#3d5a80', // 對白：藏青
  Quiz: '#b2591f', // 選擇：鏽橘（分岔要醒目）
  MissionAnswerInput: '#9c3d54', // 作答：酒紅
  CustomValueInput: '#6b7d3a', // 輸入：橄欖綠
  Img: '#2b7a78', // 圖片：深青綠
};

export const MODEL_TINT = {
  MissionStart: '#2f3e46', // 實心
  GameStart: '#2f3e46',
  Talk: '#eef1f7',
  Quiz: '#fbf0e7',
  MissionAnswerInput: '#f9edf0',
  CustomValueInput: '#f2f4e9',
  Img: '#e9f4f3',
};

// 深色模式的對應組。不是把上面那組套濾鏡——「壓低明度」的前提是白底，
// 換成深底之後同一組色會整片糊掉，所以每個色相都要重新定一次明度。
//
// 定色時守住兩件事：① 色相不動（藏青還是藏青，換了色相等於換了圖例）；
// ② 提亮但不提彩度，否則就會長回上面那行註解在防的「AI 感亮藍紫」。
// 各色對 canvas 底（#1c2429）實測皆 ≥ 3:1，符合 WCAG 非文字對比。
export const MODEL_COLOR_DARK = {
  MissionStart: '#93a7b2', // 章節錨點：翻到 ramp 另一端——深色模式下「最重的那顆」是最亮的
  GameStart: '#93a7b2',
  Talk: '#5b82b8', // 對白：藏青
  Quiz: '#e08a4a', // 選擇：鏽橘
  MissionAnswerInput: '#c4657f', // 作答：酒紅
  CustomValueInput: '#9db862', // 輸入：橄欖綠
  Img: '#45aba8', // 圖片：深青綠
};

// 節點底色。第一版做成「與畫布同明度」去對稱淺色模式，結果整片糊在一起——
// 那個對稱是錯的：淺色模式的節點底只比畫布亮 1.08 倍就分得出來，深色模式不行。
// 低亮度下人眼的對比敏感度本來就比較差，而且深色介面的慣例是**浮起來 ＝ 更亮**，
// 不是「同一階、靠外框辨識」。
//
// 所以這組是往上拉的：對畫布落在 1.29–1.35，看得出是一塊獨立的面，又還沒亮到搶走
// 外框與文字。主文在每一格上都有 11.8:1 以上。
// 註：畫布從藍灰改成中性灰之後這組重算過一次——比例是對「畫布」算的，畫布換了就得跟著換。
export const MODEL_TINT_DARK = {
  MissionStart: '#93a7b2', // 實心，與外框同色
  GameStart: '#93a7b2',
  Talk: '#212b3b',
  Quiz: '#33261a',
  MissionAnswerInput: '#36212c',
  CustomValueInput: '#272d1a',
  Img: '#142e30',
};

// 連線色。原本有三份複本（FlowMap、FlowLegend、scripts/flowmap.js），
// 而 CLI 那份還停在被否決過的亮紫／亮藍——圖例與圖畫出來的顏色對不上，
// 因為它們從來不是同一個常數。收斂到這裡，三邊只剩一個來源。
export const EDGE_COLOR = {
  option: '#b2591f', // Quiz 選項：與節點的鏽橘同色，一眼看出是分岔
  jump: '#78909c', // nextId 跳轉：虛線，中性灰
  seq: '#b0bec5', // 依順序：最淡，因為它是預設情況，不需要被看見
};

export const EDGE_COLOR_DARK = {
  option: '#e08a4a',
  jump: '#90a4ae',
  seq: '#546e7a',
};

// 流程圖自己的中性色。放這裡而不是 theme.js，是因為 scripts/flowmap.js 是 Node CLI，
// 匯入不了 MUI；而它輸出的 SVG 與畫面上的流程圖必須是同一張圖。
//
// 這組原本在 CLI 裡有一份完全不同的複本（Tailwind slate ＋ 亮紫 #7c3aed），
// 也就是說「用 CLI 匯出的流程圖」跟「畫面上看到的流程圖」從來不是同一個配色。
//
// canvas 為什麼不直接用 background：淺色模式的畫布要比面板**凹**一階（#fafafa < #fff），
// 深色模式的畫布卻要比面板**深**一階（#1c2429 < #263238）——同一個角色在兩種模式落在
// 不同的 background 階，所以它必須是自己的一個 token。
export const FLOW_PALETTE = {
  canvas: '#fafafa', // 畫布底
  dot: '#dfe3e6', // 點陣底紋，同時也是節點的預設外框
  fallback: '#b0bec5', // 認不得的 model
  fallbackTint: '#f8fafc',
  surface: '#fff', // 選項標籤的底、被選中的節點
  ink: '#263238', // 節點主文
  sub: '#90a4ae', // 節點角落的列號
  anchorInk: '#fff', // 錨點是實心底，字色與其他節點相反
  anchorSub: 'rgba(255,255,255,0.6)',
  anchorBadge: 'rgba(255,255,255,0.72)',
  dangerSurface: '#fbeceb', // 走不到的節點
  dangerMain: '#b23c2f',
};

export const FLOW_PALETTE_DARK = {
  canvas: '#0e0f11',
  dot: '#2f3338', // 兼作節點外框——太暗的話節點邊界等於不存在
  fallback: '#4a4f56',
  fallbackTint: '#1c1f22',
  surface: '#17191c',
  ink: '#e8eaed',
  sub: '#8b9098',
  anchorInk: '#0e0f11', // 深色模式的錨點是淺色實心，所以字翻成深的
  anchorSub: 'rgba(14,15,17,0.62)',
  anchorBadge: 'rgba(14,15,17,0.72)',
  dangerSurface: '#2e1d1a',
  dangerMain: '#e07a6a',
};
