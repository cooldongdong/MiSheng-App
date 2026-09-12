// theme.js
// 全站配色的單一真相——/create 與 /demo（遊戲）共用同一組 palette。
//
// 為什麼共用：遊戲在 /create 裡是渲染在這個 ThemeProvider 底下的。兩邊各有一份 theme
// 的話，遊戲的 MUI 元件會拿到 /create 的值、遊戲自己寫死的底色卻不會跟著換——那正是
// 「深色模式下底部 icon 顏色很奇怪」的成因：背景寫死 #f8f9fa（淺），icon 卻吃到了深色
// 模式的 text.secondary（淺灰），淺灰畫在近白上。
//
// 為什麼顏色不寫在元件裡：深色模式要的不是「另一組顏色」，是**同一個語意在兩種底色下各有一個值**。
// 只要元件端留下的是語意（text.secondary、divider、background.paper），值就能整組換掉而不用碰元件。
// 反過來，元件裡每多一個 hex，深色模式就多一個要手動維護的分支——這正是本次重構要清掉的東西
// （動工前實測：src/create/ 有 115 處寫死顏色，其中 96 處只是 chrome，不帶任何語意）。
//
// 為什麼沿用藍灰而不另挑一組中性深色：藍灰是這個專案既有的主色
// （遊戲殼 ThemeColorLayer 預設 #37474F、官網 HomeApp 的 ACCENT 同色）。
// 深色模式把同一條 ramp 上下對摺，三個入口才會看起來像同一個產品；換色相等於讓
// 唯一的品牌訊號在深色下消失。

import { createTheme } from '@mui/material';
import { GROUND } from './ground.js';
import {
  MODEL_COLOR,
  MODEL_TINT,
  MODEL_COLOR_DARK,
  MODEL_TINT_DARK,
  EDGE_COLOR,
  EDGE_COLOR_DARK,
  FLOW_PALETTE,
  FLOW_PALETTE_DARK,
} from './flowPalette';

// MUI Blue Grey，標階數是為了讓「哪兩階被合併了」看得見
const BG = {
  50: '#eceff1',
  100: '#cfd8dc',
  200: '#b0bec5',
  300: '#90a4ae',
  400: '#78909c',
  500: '#607d8b',
  600: '#546e7a',
  700: '#455a64',
  800: '#37474f',
  900: '#263238',
};

// flowLayout 那組（CLI 也在用的同一份）攤進 palette。
// 兩種模式的結構一模一樣，差別只在餵進來的是哪一組常數。
// 對話層：遊戲的故事畫面。它在兩種模式下都是同一個樣子——底是 ThemeColorLayer 的深墨
// （或蓋在上面的插圖），輸入框是白的。這是刻意的：那塊區域疊著創作者的美術，跟著模式
// 翻會把畫面弄髒。
//
// 所以畫在它上面的東西**必須用固定色**，不能吃 text.primary / primary 這類會隨模式變的
// token。實證過兩次都是同一個錯：送出鈕先吃 primary（藍灰墨）跟深底同階而消失，改成
// common.white 之後又跟白色輸入框同色而消失——因為那顆鈕坐的是輸入框的白底，不是深底。
const DIALOGUE = {
  surface: '#37474F', // 故事畫面的底
  onSurface: '#fff', // 畫在底上的字
  field: '#fff', // 輸入框永遠是白的
  onField: '#b2591f', // 畫在輸入框上的動作色（鏽橘，對白底 4.9:1）
  onFieldHover: '#8f4718',
  // 輸入框上不是動作的字（label、提示）。動作色會讓「輸入答案」這種說明文字
  // 看起來像可以點，所以另給一階中性深灰（對白底 7.0:1）。
  onFieldMuted: '#5f6368',
  onFieldText: '#202124', // 使用者打進去的字（對白底 16.1:1）
};

const flow = (p, modelColor, modelTint, edge) => ({
  canvas: { bg: p.canvas, dot: p.dot, fallback: p.fallback, fallbackTint: p.fallbackTint, surface: p.surface },
  model: { color: modelColor, tint: modelTint },
  edge,
  node: { ink: p.ink, sub: p.sub, anchorInk: p.anchorInk, anchorSub: p.anchorSub, anchorBadge: p.anchorBadge },
  error: { main: p.dangerMain, surface: p.dangerSurface },
});

// 文字灰原本有 7 階（900/800/600/500/400/300/200），但 7 階灰沒有 7 種意思——
// 例如 #546e7a(600) 與 #607d8b(500) 差不到 3% 明度，那是同一個東西被寫了兩次。
// 合併成 MUI 既有的三階，順便把最淡的一階往上提（#90a4ae 在白底只有 2.6:1，是實際讀不清楚的）。
const light = {
  palette: {
    mode: 'light',
    text: { primary: BG[900], secondary: BG[600], disabled: BG[400] },
    // primary ＝ 主要動作（按鈕、連結）；secondary ＝ 你現在在哪（選中、啟用中）。
    // 分成兩個角色是因為 A 案實測有個功能性缺陷：primary 用藍灰墨的話，深色模式下
    // 「選中」(#90a4ae) 與「未選中」(#78909c) 只差一階明度，使用者分不出在哪一頁。
    // 把狀態交給鏽橘，按鈕才留得住藍灰墨那個近黑的質感。
    primary: { main: BG[800], contrastText: '#fff' },
    secondary: { main: '#b2591f', contrastText: '#fff' },
    divider: BG[100],
    background: {
      default: GROUND.app.light,
      paper: '#fafafa',
      // 浮在流程圖畫布上的工具列。半透明是刻意的——底下的節點要能透出來當空間線索
      overlay: 'rgba(255,255,255,0.94)',
    },
    ...flow(FLOW_PALETTE, MODEL_COLOR, MODEL_TINT, EDGE_COLOR),
    game: { frame: GROUND.game.light, bg: '#eee', nav: '#f8f9fa' },
    dialogue: DIALOGUE,
  },
};

// 深色模式走中性灰，不是把淺色的藍灰 ramp 直接翻過來。
//
// 第一版是翻 ramp（底 #1c2429、面板 #263238），邏輯上很整齊，實際上不行：藍灰在淺色
// 是「白底上的一抹冷色」，很淡；一旦拿它當**底色**，那個藍就鋪滿整個畫面，變成一層洗
// 不掉的藍。同一個色相在「當點綴」與「當底」是兩種完全不同的東西。
//
// 所以底改成近中性（彩度極低、只留一點點冷讓它不死灰），彩度全部留給 accent——
// 這正是多數 SaaS 深色介面的做法：底安靜到你不會注意它，顏色只出現在有意義的地方。
// 淺色模式維持藍灰不動：白底上那抹冷色本來就成立，那不是需要修的東西。
const NEUTRAL = {
  abyss: GROUND.app.dark, // 最底層——值住在 ground.js，見那個檔的檔頭
  raised: '#17191c', // 面板、卡片
  line: '#2a2d31', // 分隔線
  ink: '#e8eaed',
  inkBody: '#a1a6ad',
  inkMuted: '#6e737a',
};

const dark = {
  palette: {
    mode: 'dark',
    text: { primary: NEUTRAL.ink, secondary: NEUTRAL.inkBody, disabled: NEUTRAL.inkMuted },
    // 深色的 primary 不再是藍灰墨，而是「墨的另一端」——淺色模式的主要按鈕是近黑，
    // 深色模式就是近白。primary 從頭到尾代表的都是「最重的那個動作」，不是某個色相。
    primary: { main: NEUTRAL.ink, contrastText: NEUTRAL.abyss },
    secondary: { main: '#e08a4a', contrastText: NEUTRAL.abyss },
    divider: NEUTRAL.line,
    background: { default: NEUTRAL.abyss, paper: NEUTRAL.raised, overlay: 'rgba(23,25,28,0.94)' },
    ...flow(FLOW_PALETTE_DARK, MODEL_COLOR_DARK, MODEL_TINT_DARK, EDGE_COLOR_DARK),
    // 遊戲外殼。frame 是桌機上遊戲兩側的襯底、bg 是遊戲頁面底、nav 是底部導覽。
    // 關卡卡片（MissionItem 的 #37474F）刻意兩種模式都不動：它在淺色是「深卡片浮在淺頁」，
    // 在深色剛好變成「亮一階的卡片浮在更深的頁」，同一個值兩邊都成立。
    game: { frame: GROUND.game.dark, bg: NEUTRAL.abyss, nav: NEUTRAL.raised },
    dialogue: DIALOGUE, // 與淺色同一份，見上方註解
  },
};

// 工廠，不是成品。
//
// 有兩種需求：三個入口共用 palette，但官網首頁要自己的襯線字體。
// 直覺的做法是 `createTheme(theme, { typography })`——**那會壞**：MUI 的 cssVariables
// 主題帶著一個私有的 `vars` 欄位，把建好的 theme 再餵回 createTheme 會直接丟
// 「`vars` is a private field」而讓整頁空白（2026-08-29 實測，畫面只剩底色）。
//
// 所以差異要在**建之前**就併進去，不能建完再疊。
export const createAppTheme = (extra = {}) =>
  createTheme({
  // colorSchemeSelector: 'data' → 產出 [data-mui-color-scheme="dark"] 選擇器，
  // 值走 CSS 變數。SVG 的 fill/stroke 吃不到 MUI 的 sx token，但吃得到 var(--mui-palette-*)，
  // 這是流程圖那 7 處 SVG 顏色不用在 JS 裡判斷 mode 的關鍵。
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: { light, dark },
  components: {
    MuiButton: {
      styleOverrides: {
        // 遊戲的主要動作鈕（NextButton / EndIconButton）用的是 color="inherit"，
        // MUI 對它給的是 grey[300] / grey[800]。淺色模式下那是一塊近白的膠囊，疊在
        // 遊戲插圖上剛好；深色模式下卻變成 #424242 —— 一塊跟品牌毫無關係的中性暗灰，
        // 而且在深底上幾乎看不見。這裡只改深色那一半，淺色維持原樣。
        containedInherit: ({ theme }) =>
          theme.applyStyles('dark', {
            backgroundColor: theme.vars.palette.primary.main,
            color: theme.vars.palette.primary.contrastText,
            '&:hover': { backgroundColor: theme.vars.palette.primary.light },
          }),
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        // 「你在這」＝**亮度**，不是顏色。
        //
        // 這裡原本是 secondary（鏽橘）。2026-09-07 底部導覽做出主從之後，
        // 鏽橘被指派給另一件事——「解謎是家」（見 player/component/BottomNavigation.jsx）。
        // 兩個訊號共用一個顏色就會互相冒充：站在道具頁時「解謎」是橘的，
        // 而橘色在多數介面裡代表「選中」，於是玩家會以為自己在解謎那一頁。
        //
        // 所以狀態改走亮度：選中＝text.primary ＋ 加粗，沒選中＝繼承 MUI 預設的
        // text.disabled。顏色那個維度整個讓給「身分」。
        root: ({ theme }) => ({
          '&.Mui-selected': {
            color: theme.vars.palette.text.primary,
            fontWeight: 600,
          },
        }),
      },
    },
  },
  // **中文釘死在 Noto Sans TC，拉丁字母與數字留給系統字型。**
  //
  // 原本這裡什麼都沒設，於是吃 MUI 預設的 `"Roboto","Helvetica","Arial"`——
  // 那三個**都沒有中文字**，所以每個平台各自去挑自己的中文 fallback：
  // iOS 拿到 PingFang TC、Android 拿到 Noto Sans CJK 或更糟的東西。
  // Dong 2026-09-12 在兩台手機上比出來的症狀是「Android 比較細、看起來虛」——
  // 那是 **fallback 沒有真的 700 字面，Chrome 只好自己合成粗體**的長相。
  //
  // 為什麼把中文排在最後而不是最前：拉丁與數字用各平台自己的系統字型就很好，
  // 而且不必為它們下載任何東西；**兩邊真正會長不一樣的只有中文**，釘住那一段就夠。
  //
  // **四個 HTML 入口載的是 `wght@100..900`（變數字型），不是幾個固定字重。**
  // 我第一版只載 400 與 700，結果 MUI 預設用 500 的那些（h6、subtitle2、Button）
  // 沒有字面可用，又退回各平台自己合成——**等於把剛修好的問題換個地方重現一次**。
  // 而且 code 裡實際用到 400/500/600/700/800/900 六種。變數字型一個檔涵蓋整段
  // 軸線，比列三個固定字重（每個 unicode 切片各一個檔）還省。
  //
  // 標題那幾個元件（MissionTitleText 等）自己覆寫成 Noto Serif TC，不受影響；
  // 官網首頁則整份換成襯線（見 site/main.jsx），它傳進來的 typography 會覆蓋這裡。
  //
  // **刻意不設 `font-synthesis: none`。** 它能讓「字型沒載到」現形而不是變成醜的
  // 合成粗體，但實境解謎是在戶外用行動網路——字型載不到時寧可有醜的粗體，
  // 也不要整篇沒有重點。
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans TC", sans-serif',
  },
  ...extra,
});

// 預設成品：/create 與遊戲用這個
const theme = createAppTheme();

export default theme;
