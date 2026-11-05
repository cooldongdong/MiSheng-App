import { Box } from '@mui/material';
import { MotionConfig, motion, useScroll } from 'motion/react';

import ColorSchemeToggle from '../shared/ColorSchemeToggle';
import Hero from './home/Hero';
import RowToScreen from './home/RowToScreen';
import Outro from './home/Outro';

// 官網首頁。整頁是一條說明線，每一段只回答一個問題：
//   Hero        這是什麼？        → 你的試算表，變成玩家手機上的那一頁（變形動畫）
//   RowToScreen 怎麼運作？        → 一列＝一個畫面，欄位決定畫面長什麼樣（捲動敘事）
//   Playground  真的這麼簡單？    → 自己改一格、自己解謎、自己弄壞它看 validator 擋（互動）
//   Features    還有什麼要知道的？ → 不用寫程式、掃碼開玩、資料在你手上、開源
//   Outro       然後呢？          → 兩個入口
//
// 顏色仍然一律走 theme 的語意 token（見 git log：首頁曾因寫死 hex 而沒有深色模式）。
// 唯一的強調色是 secondary（鏽橘）——它在遊戲裡就是「玩家要按的那個東西」的顏色。
//
// 動畫一律跟隨系統的「減少動態效果」：MotionConfig reducedMotion="user"
// 讓 motion 的位移動畫在那種設定下直接跳到終點；自己寫的 CSS keyframes 各自處理。

// 頂端的閱讀進度條
const ScrollBar = () => {
  const { scrollYProgress } = useScroll();
  return (
    <Box
      component={motion.div}
      style={{ scaleX: scrollYProgress }}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        bgcolor: 'secondary.main',
        transformOrigin: '0 50%',
        zIndex: 20,
      }}
    />
  );
};

const HomeApp = () => (
  <MotionConfig reducedMotion="user">
    <ScrollBar />
    {/* 右上角＝這一頁的控制項，與 /create、/demo 同一個座標 */}
    <Box sx={{ position: 'fixed', top: 6, right: 10, zIndex: 10 }}>
      <ColorSchemeToggle />
    </Box>
    <Hero />
    <RowToScreen />
    <Outro />
  </MotionConfig>
);

export default HomeApp;
