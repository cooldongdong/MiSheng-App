import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ART_BY_IMG } from './art';

// 遊戲對話畫面的「長相複本」：立繪鋪滿、下半漸層到墨色、底部是說話者＋對白。
//
// **為什麼不直接用播放器的 TalkModel。** 那顆元件吃 GameContext（整份遊戲資料、
// 關卡狀態、自訂變數），首頁只要一個畫面就得把整台播放器架起來。
// 這裡只抄外觀的三個參數——漸層的 12%／66%、墨色 dialogue.surface、白字——
// 播放器的版面改了，這裡要跟著看一眼。

const useTypewriter = (text, enabled) => {
  const reduce = useReducedMotion();
  const [n, setN] = useState(enabled && !reduce ? 0 : text.length);
  useEffect(() => {
    if (!enabled || reduce) {
      setN(text.length);
      return undefined;
    }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 45);
    return () => clearInterval(id);
  }, [text, enabled, reduce]);
  return text.slice(0, n);
};

// data-slot：hero 要知道說話者與對白在手機上的位置，才能讓試算表的格子飛過去落在那裡
const GameScreen = ({ img, speaker, text = '', typewriter = true, children }) => {
  const shown = useTypewriter(text, typewriter);
  // 立繪一律用重畫的插畫；查不到（例如角色名字打錯）就是一片墨色底，跟遊戲裡一樣
  const Art = ART_BY_IMG[img];
  return (
    <Box sx={{ position: 'absolute', inset: 0, color: '#fff', fontSize: '5.6cqw' }}>
      <AnimatePresence initial={false}>
        {Art && (
          <motion.div
            key={img}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Art />
          </motion.div>
        )}
      </AnimatePresence>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '80%',
          background: (t) => `linear-gradient(transparent 12%, ${t.palette.dialogue.surface} 66%)`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          p: '8%',
          pb: '10%',
          fontFamily: '"Noto Sans TC", sans-serif',
        }}
      >
        {speaker && (
          <Typography
            data-slot="speaker"
            sx={{ fontWeight: 700, fontSize: '0.95em', mb: '0.6em', opacity: 0.95, fontFamily: 'inherit' }}
          >
            {speaker}
          </Typography>
        )}
        <Typography
          data-slot="text"
          sx={{ fontSize: '0.85em', lineHeight: 1.7, minHeight: '3.4em', fontFamily: 'inherit' }}
        >
          {shown}
          {shown.length < text.length && (
            <Box component="span" sx={{ opacity: 0.5 }}>
              ▍
            </Box>
          )}
        </Typography>
        {children}
      </Box>
    </Box>
  );
};

GameScreen.propTypes = {
  img: PropTypes.string,
  speaker: PropTypes.string,
  text: PropTypes.string,
  typewriter: PropTypes.bool,
  children: PropTypes.node,
};

export default GameScreen;
