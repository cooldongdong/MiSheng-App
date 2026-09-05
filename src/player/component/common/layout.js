// 底部導覽列的高度。
//
// 抽成常數是因為有三個地方要對齊它：導覽列自己的位置（GameShell）、/create 把它
// 推到欄位下方時的位移，以及**放大看圖的舞台要往下多蓋這麼多**——不然導覽列收起來
// 之後那一條會變成空白（Dong 2026-09-05 在 /create 回報）。
//
// 值來自 MUI BottomNavigation 的預設高度。
export const NAV_HEIGHT = 56;

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
