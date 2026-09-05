import PropTypes from 'prop-types';
import { useContext } from 'react';
import { Box } from '@mui/material';
import { GameContext } from '../../store/game-context';

// 淡入淡出的節奏。四個使用者共用同一組——縮小鈕、左上品牌標、右上那排按鈕、
// 底部導覽列。分成四個地方各寫一次的話，遲早會有一個沒跟上。
//
// **進場慢、退場快**：玩家點畫面是為了「把介面弄走、看清楚圖」，那個意圖要立刻
// 被滿足；反過來叫它回來時慢一點反而顯得穩。等長的一進一出會讓退場拖泥帶水。
//
// 曲線也分兩種：進場用先快後慢（東西滑進來、停穩），退場用持續加速（東西離開，
// 不必看它慢慢消失）。等速的 ease 兩個方向都不對。
export const CHROME_FADE_MS = 220; // 進場
export const CHROME_FADE_OUT_MS = 140; // 退場
const EASE_ENTER = 'cubic-bezier(0.4, 0, 0.2, 1)';
const EASE_EXIT = 'cubic-bezier(0.4, 0, 1, 1)';

// 全螢幕看圖時，「點一下」要收起／叫回的那些介面：縮小鈕、左上品牌標、
// 右上那排按鈕。**四個角落必須是同一份實作**——分開各寫一次，遲早會有一個
// 沒跟上，那就是「按鈕回來的時間不一樣」（Dong 2026-09-05）。
//
// 為什麼是 opacity 而不是掛載／卸載：後者是「啪」一下出現與消失，淡不順。
// 隱藏時一併關掉 pointerEvents，否則看不見的按鈕還按得到。
//
// 條件寫成 `overlayOpen && !overlayChromeVisible`：沒有東西全螢幕時，這些介面
// 一律顯示——chrome 的顯隱只在全螢幕的情境下有意義。
const ChromeFade = ({ children }) => {
  const { overlayOpen, overlayChromeVisible } = useContext(GameContext);
  const hidden = overlayOpen && !overlayChromeVisible;
  return (
    <Box
      sx={{
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: hidden
          ? `opacity ${CHROME_FADE_OUT_MS}ms ${EASE_EXIT}`
          : `opacity ${CHROME_FADE_MS}ms ${EASE_ENTER}`,
      }}
    >
      {children}
    </Box>
  );
};

ChromeFade.propTypes = { children: PropTypes.node };

export default ChromeFade;
