import PropTypes from 'prop-types';
import { useContext } from 'react';
import { Box } from '@mui/material';
import { GameContext } from '../../store/game-context';

// 淡入淡出的時間。四個使用者共用同一個值——縮小鈕、左上品牌標、右上那排按鈕、
// 底部導覽列。分成四個地方各寫一次的話，遲早會有一個沒跟上。
export const CHROME_FADE_MS = 240;

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
        transition: `opacity ${CHROME_FADE_MS}ms ease`,
      }}
    >
      {children}
    </Box>
  );
};

ChromeFade.propTypes = { children: PropTypes.node };

export default ChromeFade;
