import { Box } from '@mui/material';
import { MotionConfig } from 'motion/react';

import ColorSchemeToggle from '../shared/ColorSchemeToggle';
import Hero from './home/Hero';
import RowToScreen from './home/RowToScreen';
import ModelsProps from './home/ModelsProps';
import NavTour from './home/NavTour';
import Playground from './home/Playground';
import Features from './home/Features';
import HowTo from './home/HowTo';
import Outro from './home/Outro';

// 官網首頁。整頁是一條說明線，每一段只回答一個問題：
//   Hero        這是什麼？        → 你的試算表，一列一列飛進玩家的手機
//   RowToScreen 怎麼運作？        → 一列＝一個畫面，欄位決定畫面長什麼樣（捲動敘事）
//   ModelsProps 能做出什麼？      → model 的八種畫面、prop 的四種道具（翻牌＋拼貼）
//   NavTour     玩家手上還有什麼？ → 底部導覽列五顆，各吃一張表（手機上的按鈕真的能按）
//   Playground  真的這麼簡單？    → 自己改一格、自己解謎、自己弄壞它看 validator 擋（互動）
//   HowTo       我要怎麼開始？    → Google 試算表＋/create，或在自己電腦跑（切換＋步驟）
//   Features    還有什麼要知道的？ → 不用寫程式、掃碼開玩、資料在你手上、開源
//   Outro       然後呢？          → 兩個入口
//
// 顏色仍然一律走 theme 的語意 token（見 git log：首頁曾因寫死 hex 而沒有深色模式）。
// 唯一的強調色是 secondary（鏽橘），它在遊戲裡就是「玩家要按的那個東西」的顏色。
// 插畫另有一套固定的印刷色（home/art/palette.js），不跟著深淺模式翻。
//
// 動畫一律跟隨系統的「減少動態效果」：MotionConfig reducedMotion="user"
// 讓 motion 的位移動畫在那種設定下直接跳到終點；自己寫的 CSS keyframes 各自處理。

const HomeApp = () => (
  <MotionConfig reducedMotion="user">
    {/* 右上角＝這一頁的控制項，與 /create、/demo 同一個座標 */}
    <Box sx={{ position: 'fixed', top: 6, right: 10, zIndex: 10 }}>
      <ColorSchemeToggle />
    </Box>
    <Hero />
    <RowToScreen />
    <ModelsProps />
    <NavTour />
    <Playground />
    <HowTo />
    <Features />
    <Outro />
  </MotionConfig>
);

export default HomeApp;
