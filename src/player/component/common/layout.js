// 底部導覽列的高度。
//
// 抽成常數是因為有三個地方要對齊它：導覽列自己的位置（GameShell）、/create 把它
// 推到欄位下方時的位移，以及**放大看圖的舞台要往下多蓋這麼多**——不然導覽列收起來
// 之後那一條會變成空白（Dong 2026-09-05 在 /create 回報）。
//
// 值來自 MUI BottomNavigation 的預設高度。
export const NAV_HEIGHT = 56;

// 放大之後，內容最寬能到哪。
//
// **這個上限存在的理由是「放大不等於攤開」。** 沒有它，內容會跟著視窗一起長：
// 在寬螢幕上圖片被拉到失真、文章一行變成四、五十個中文字，眼睛從行尾找回行首
// 就會掉行（Dong 2026-09-11 附圖：1200px 的視窗下整篇攤成一片）。
//
// 兩邊共用同一個常數，是因為它們必須是同一個數字而不是「剛好一樣」：
// ZoomableImage 的放大圖與 ArticleModel 的滿版閱讀欄，使用者看到的是同一種
// 「放大」，一邊改了另一邊沒跟上，就會變成兩套介面。
// （flowPalette 曾經有三份色票複本，最舊那份停在被否決過的配色上。）
export const OVERLAY_MAX_WIDTH = 600;

// 對話框要 portal 到哪裡。
//
// **MUI 的 Dialog／Modal 用 portal 掛到 `document.body`，而 portal 不是後代。**
// `#main-container` 的 transform 只關得住「後代」裡的 `position: fixed`，
// 所以對話框逃得掉——在 /create 的三欄畫面裡，一個全文顯示會連左邊的驗證報告
// 與右邊的流程圖一起蓋掉（COO-174）。
//
// **為什麼不是直接掛進 `#main-container`：** 它的 `z-index: 550` 讓它自己成為一個
// 堆疊脈絡，裡面的東西不管標多少，對外都只值 550——而底部導覽列是 700。
// 掛進去的對話框會被導覽列蓋住（2026-09-05 放大圖的縮小鈕標 1102 照樣被蓋掉，
// 就是這個）。所以要的是**它的兄弟**，不是它的子孫。
//
// 這個 host 由 GameShell 畫，規格是：z-index 800（贏過導覽列）、自己帶 transform
// （把底下的 `fixed` 關進自己的框）、`pointer-events: none`（空的時候不擋點擊）。
export const GAME_OVERLAY_ID = 'game-overlay';

/**
 * 給 MUI Dialog／Modal 的 `container`。
 *
 * **傳函式而不是元素**：MUI 的 Portal 接受函式，會在真正掛載時才呼叫——
 * 而對話框一開始都是關著的，等它要開的時候 host 早就在了。傳元素就得自己處理
 * 「第一次 render 時 host 還不存在」。
 *
 * **找不到時回 null，MUI 就退回 body**——也就是現況。所以不在 GameShell 裡面的
 * 對話框（例如官網或 /create 自己的）用了這個也不會出事，它會自動退回去。
 */
export const gameOverlayContainer = () =>
  (typeof document === 'undefined'
    ? null
    : document.getElementById(GAME_OVERLAY_ID));

// 底部導覽列的五個分頁。
//
// 抽成常數是因為它從「只有 GameShell 自己看得懂的 useState(2)」變成了跨檔案的約定：
// 關卡頁按下跳關之後要把畫面切到解謎頁（COO-188），而那段 code 在 MissionPage。
// 裸數字在同一個檔案裡還讀得懂，跨檔案就只是 magic number——`goToTab(2)` 沒有人
// 看得出來是哪一頁。
//
// **順序跟著 BottomNavigation 裡的 BottomNavigationAction 走**，改那邊就要改這裡。
export const TAB = {
  MISSIONS: 0,
  PROPS: 1,
  PLAY: 2,
  HINTS: 3,
  STORIES: 4,
};
