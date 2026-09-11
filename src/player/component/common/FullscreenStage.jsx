import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import { NAV_HEIGHT } from './layout';

// 全螢幕的「舞台」。放大的圖與 Article 的滿版閱讀共用這一個。
//
// **抽出來的理由是「跟 img 一樣」必須由構造保證，不能靠照抄數值。**
// 這一層的每一條規則都是被實機咬出來的（見下面），複製第二份的話，
// 下一次修其中一邊、另一邊就會安靜地不一樣——flowPalette 曾經有三份色票複本，
// 而最舊的那份停在被否決過的配色上，圖例跟圖畫出來的顏色從來不是同一組。
//
// 三條規則：
//
// ① **fixed ＋ inset，不是 100vw/100vh。** 後者量的是「視窗」，嵌在 /create 的
//    三欄裡時會溢出去蓋掉左欄與流程圖（Dong 2026-09-05 附圖）。fixed 填的是
//    定位基準，而 GameShell 的 #main-container 在嵌入模式會掛 transform，
//    於是全螢幕自動被關回遊戲那一欄。
//
// ② **往下多蓋一條導覽列**（bottom: -NAV_HEIGHT）。/create 的舞台只有預覽欄，
//    導覽列坐在欄位下方那 56px，收起來之後那一條會變成空白。玩家端多出來的
//    部分落在視窗外，看不到也不影響。
//
// ③ **會裁切**，而且子孫用 absolute 不用 fixed——overflow:hidden 裁不到
//    position:fixed 的子孫，除非裁切的那一層剛好是它們的定位基準。
//
// data-no-swipe 掛在這一層就夠：useSwipeFlow 是用 closest() 往上找的。
// **底色走 theme，不寫死。**
//
// 原本是 `rgb(200, 200, 200)`——一個只在淺色模式成立的中灰。深色模式下它變成
// 「亮底配暗卡」（面板 #17191c 對它是 10.5:1，關係整個反過來），Dong 2026-09-12
// 回報「展開時的顏色有點怪」。這是 2026-08-28 那條的又一個實例：**換 palette 的
// 時候，沒有被定義的語意會安靜地留在預設值上**，而那些地方不會報錯。
//
// 用 `game.bg` 是因為**舞台蓋住的是遊戲欄本身**（GameShell.jsx:219 用的就是它），
// 所以放大之後背後露出來的，應該跟卡片原本站的那一塊是同一個顏色。
//
// 我第一次挑的是 `game.frame`（GameShell.jsx:202，遊戲欄**兩側**的襯底），結果
// 一放大底色就從 #0e0f11 跳成 #08090a——差一階，而 Dong 一眼就看出來了
//（2026-09-12：「為什麼我這邊看起來顏色是不一樣的？」）。
// 兩個 token 名字都像，差別只在「遊戲欄裡面」與「遊戲欄旁邊」，而舞台蓋的是前者。
const FullscreenStage = ({ children, onBackdropClick, backdrop = 'game.bg' }) => (
  <Box
    data-no-swipe
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: -NAV_HEIGHT,
      m: '0 !important',
      overflow: 'hidden',
      zIndex: 1000,
    }}
  >
    {/* 背景，點擊可縮小。
        **不透明**：一度是 0.9，於是底下那一頁的介面會隱約透出來——平常被內容
        蓋住看不到，但往下拖曳時上緣露出來，NEXT 鈕就浮在那裡（Dong 附圖）。
        在看謎面／讀文章的時候不該看到別的東西。 */}
    <Box
      onClick={onBackdropClick}
      sx={{ position: 'absolute', inset: 0, backgroundColor: backdrop }}
    />
    {children}
  </Box>
);

FullscreenStage.propTypes = {
  children: PropTypes.node,
  onBackdropClick: PropTypes.func,
  backdrop: PropTypes.string,
};

export default FullscreenStage;
