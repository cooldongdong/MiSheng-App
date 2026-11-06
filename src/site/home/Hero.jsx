import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'motion/react';
import MiniSheet from './MiniSheet';
import { tint } from './tint';
import PhoneFrame from './PhoneFrame';
import PlayerScreen from './PlayerScreen';
import PaperClouds from './PaperClouds';
import BrandMark from '../../shared/BrandMark';

// Hero：試算表在後、手機在前，像兩張疊在一起的紙。
//
// 這是整頁唯一要在三秒內講完的那件事：**你填的那一列，就是玩家看到的那一頁。**
// 第一版是「整張表變形成手機」，只有兩格有飛過去，其他東西直接消失又出現——
// Dong 的回饋是看不出關聯。所以改成兩樣東西同時在場，亮起來的那一列一路往下走，
// 每走到一列，那一列的 speaker、text 就變成紙條飛進手機，落在名牌和對話框的位置上，
// 手機才跟著換人、打出那句話。因果的方向（表 → 手機）每一拍都看得到。

const COLUMNS = [
  { key: 'model', width: '6.4em' },
  { key: 'speaker', width: '6.2em' },
  { key: 'text', width: '1fr' },
];
const ROWS = [
  { rowNo: 2, cells: { model: 'GameStart', speaker: '', text: '' } },
  { rowNo: 3, cells: { model: 'Talk', speaker: '謎之音', text: '你醒啦！' } },
  { rowNo: 4, cells: { model: 'Talk', speaker: '玩家.', text: '你是誰？我在哪？' } },
  { rowNo: 5, cells: { model: 'Talk', speaker: '謎之音', text: '我怎麼知道你是誰？你又沒告訴我' } },
  { rowNo: 6, cells: { model: 'Talk', speaker: '謎之音', text: '而且，你是誰不重要…' } },
];
const PLAY = ROWS.filter((r) => r.cells.model === 'Talk');
const FLY_KEYS = ['speaker', 'text'];

// 一拍的節奏：亮列移過去 → 格子飛 → 手機換畫面、停著讓人讀
const T = { move: 450, fly: 750, hold: 2800 };


// 標題：三行，一行一行從底下升上來（每行有自己的遮罩，像紙從縫裡抽出來）。
// 「實境解謎」底下墊一條歪一點的鏽橘紙膠帶，延續插畫的疊紙語言——
// 不是逐字模糊浮現：那是 AI 生成頁面最常見的開場，跟這一頁的手作感也不合。
const LINES = ['把一份試算表，', '變成手機就能玩的'];

const Rise = ({ children, delay }) => (
  <Box component="span" sx={{ display: 'block', overflow: 'hidden', pb: '0.08em' }}>
    <motion.span
      initial={{ y: '105%' }}
      animate={{ y: 0 }}
      transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'block' }}
    >
      {children}
    </motion.span>
  </Box>
);
Rise.propTypes = { children: PropTypes.node, delay: PropTypes.number };

const Headline = () => (
  <Typography
    component="h1"
    sx={{
      fontWeight: 900,
      fontSize: { xs: '2.3rem', sm: '3.1rem', md: '3.6rem' },
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      color: 'text.primary',
    }}
  >
    {LINES.map((l, i) => (
      <Rise key={l} delay={0.1 + i * 0.12}>
        {l}
      </Rise>
    ))}
    <Rise delay={0.34}>
      <Box component="span" sx={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
        <Box
          component={motion.span}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
          sx={{
            position: 'absolute',
            left: '-0.12em',
            right: '-0.12em',
            bottom: '0.08em',
            height: '0.42em',
            bgcolor: tint('secondary', 0.28),
            transformOrigin: 'left',
            rotate: '-1.5deg',
            boxShadow: '0 2px 4px rgba(38,50,56,.12)',
          }}
        />
        <Box component="span" sx={{ position: 'relative' }}>
          實境解謎。
        </Box>
      </Box>
    </Rise>
  </Typography>
);

// 一張紙條：從試算表那一格的位置出發，飛到手機上對應的位置
const Flyer = ({ label, from, to, delay }) => (
  <Box
    component={motion.div}
    initial={{ x: from.x, y: from.y, rotate: 0, opacity: 0, scale: 1 }}
    animate={{
      x: [from.x, from.x + 6, to.x],
      y: [from.y, from.y - 14, to.y],
      rotate: [0, -4, 0],
      opacity: [0, 1, 1],
      scale: [1, 1.08, to.scale],
    }}
    exit={{ opacity: 0, transition: { duration: 0.35 } }}
    transition={{ duration: T.fly / 1000, delay, ease: [0.45, 0, 0.2, 1], times: [0, 0.25, 1] }}
    sx={{
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 10,
      transformOrigin: '0 0',
      maxWidth: 190,
      px: 0.75,
      py: 0.25,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontSize: { xs: '0.72rem', sm: '0.78rem' },
      fontWeight: 700,
      color: 'secondary.main',
      bgcolor: 'background.paper',
      border: '1.5px solid',
      borderColor: 'secondary.main',
      borderRadius: '4px',
      boxShadow: '0 6px 14px -6px rgba(38,50,56,.45)',
      pointerEvents: 'none',
    }}
  >
    {label}
  </Box>
);
const pt = PropTypes.shape({ x: PropTypes.number, y: PropTypes.number, scale: PropTypes.number });
Flyer.propTypes = { label: PropTypes.string, from: pt, to: pt, delay: PropTypes.number };

const Morph = () => {
  const reduce = useReducedMotion();
  const box = useRef(null);
  const [i, setI] = useState(0); // 亮著的是哪一列（PLAY 的索引）
  const [screen, setScreen] = useState(0); // 手機現在演的是哪一列
  const [phase, setPhase] = useState('hold');
  const [flights, setFlights] = useState([]);
  const [paused, setPaused] = useState(false);

  // 節拍器：hold → move（亮列換下一列）→ fly（格子飛）→ hold（手機換畫面）
  useEffect(() => {
    if (reduce || paused) return undefined;
    const next = {
      hold: () => {
        setI((n) => (n + 1) % PLAY.length);
        setPhase('move');
      },
      move: () => setPhase('fly'),
      fly: () => {
        setScreen(i);
        setPhase('hold');
      },
    }[phase];
    const id = setTimeout(next, T[phase]);
    return () => clearTimeout(id);
  }, [phase, i, paused, reduce]);

  // 進入 fly 的那一刻量位置：格子在哪、手機上的名牌與對話框在哪。
  // 用量的而不是寫死座標：試算表的欄寬、手機大小都跟著螢幕寬度變。
  useLayoutEffect(() => {
    if (phase !== 'fly' || !box.current) return;
    const root = box.current;
    const o = root.getBoundingClientRect();
    const row = PLAY[i];
    setFlights(
      FLY_KEYS.map((key, n) => {
        const cell = root.querySelector(`[data-cell="${row.rowNo}.${key}"]`)?.getBoundingClientRect();
        const slot = root.querySelector(`[data-slot="${key}"]`)?.getBoundingClientRect();
        if (!cell || !slot) return null;
        return {
          key: `${row.rowNo}.${key}`,
          label: row.cells[key],
          delay: n * 0.08,
          from: { x: cell.left - o.left - 6, y: cell.top - o.top - 2 },
          to: { x: slot.left - o.left - 6, y: slot.top - o.top - 2, scale: 0.9 },
        };
      }).filter(Boolean)
    );
  }, [phase, i]);

  const shown = PLAY[screen].cells;

  return (
    <Box
      ref={box}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{ position: 'relative', width: { xs: 310, sm: 440 }, mx: 'auto', display: 'flex', flexDirection: 'column' }}
    >
      {/* 後面那張紙：試算表，歪一點 */}
      <Box sx={{ rotate: '-2deg', transformOrigin: 'center' }}>
        <MiniSheet
          id="hero"
          columns={COLUMNS}
          rows={ROWS}
          active={PLAY[i].rowNo}
          sx={{ boxShadow: '0 18px 40px -24px rgba(38,50,56,.45)' }}
        />
      </Box>

      {/* 前面那張紙：手機，壓住試算表的下緣 */}
      <Box sx={{ mt: '-34px', alignSelf: 'flex-end', mr: { xs: 1, sm: 3 }, rotate: '2deg', position: 'relative', zIndex: 2 }}>
        <PhoneFrame width={{ xs: 200, sm: 230 }}>
          <PlayerScreen page={{ model: 'Talk', speaker: shown.speaker, text: shown.text }} typewriter={!reduce} />
        </PhoneFrame>
      </Box>

      {/* 飛行中的紙條 */}
      <AnimatePresence>
        {phase === 'fly' && flights.map(({ key, ...f }) => <Flyer key={key} {...f} />)}
      </AnimatePresence>

      {/* 圖例：第幾列 → 手機上的這一頁 */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: 4, sm: 0 },
          bottom: { xs: 120, sm: 140 },
          maxWidth: { xs: 80, sm: 120 },
          fontSize: '0.8rem',
          lineHeight: 1.6,
          color: 'text.secondary',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={screen} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Box component="span" sx={{ color: 'secondary.main', fontWeight: 800 }}>
              第 {PLAY[screen].rowNo} 列
            </Box>
            <br />
            就是玩家
            <br />
            看到的這一頁 →
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
};

const Hero = () => {
  const ref = useRef(null);
  // 捲出 hero 的進度：底部的紙雲各自用不同速度往上推，景深就出來了
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  return (
    <Box
      ref={ref}
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        pt: { xs: 10, md: 8 },
        pb: { xs: 16, md: 18 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1160,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
          alignItems: 'center',
          gap: { xs: 6, md: 4 },
        }}
      >
        <Box>
          {/* 品牌：logo＋名字。整頁唯一一個標題上方的小字 */}
          <Stack
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            direction="row"
            alignItems="center"
            spacing={1}
          >
            <BrandMark size={34} />
            <Typography sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '0.05em' }}>謎生 MiSheng</Typography>
          </Stack>
          <Box sx={{ mt: 3 }}>
            <Headline />
          </Box>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '1.1rem', mt: 3, lineHeight: 1.9, maxWidth: 480 }}>
              試算表的一列，就是遊戲的一個畫面。填好、貼上連結，手機掃一下就能玩。
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button
                href="/create"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  borderRadius: 99,
                  px: 3.5,
                  py: 1.4,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxShadow: 'none',
                  '&:active': { transform: 'translateY(1px)' },
                }}
              >
                開始做遊戲
              </Button>
              <Button
                href="/demo"
                variant="outlined"
                size="large"
                sx={{
                  borderRadius: 99,
                  px: 3.5,
                  py: 1.4,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  borderColor: 'divider',
                  '&:hover': { borderColor: 'text.secondary' },
                  '&:active': { transform: 'translateY(1px)' },
                }}
              >
                玩玩 demo
              </Button>
            </Stack>
          </motion.div>
        </Box>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <Morph />
        </motion.div>
      </Box>

      <PaperClouds progress={scrollYProgress} />
    </Box>
  );
};

export default Hero;
