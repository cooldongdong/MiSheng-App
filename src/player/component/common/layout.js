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
