// 底部導覽列的高度。
//
// 抽成常數是因為有三個地方要對齊它：導覽列自己的位置（GameShell）、/create 把它
// 推到欄位下方時的位移，以及**放大看圖的舞台要往下多蓋這麼多**——不然導覽列收起來
// 之後那一條會變成空白（Dong 2026-09-05 在 /create 回報）。
//
// 值來自 MUI BottomNavigation 的預設高度。
export const NAV_HEIGHT = 56;
