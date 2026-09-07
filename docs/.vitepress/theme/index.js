// 沿用 VitePress 的預設主題，只換配色（見 custom.css）。
//
// 不自己做主題：需要的東西（側欄、大綱、搜尋、手機導覽、上一頁下一頁）
// 預設主題全都有，而那正是換掉自己寫的產生器的理由。
import DefaultTheme from 'vitepress/theme';
import './custom.css';

export default DefaultTheme;
