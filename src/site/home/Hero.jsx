import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { LayoutGroup, motion, useReducedMotion, useScroll } from 'motion/react';
import MiniSheet from './MiniSheet';
import { tint } from './tint';
import PhoneFrame from './PhoneFrame';
import GameScreen from './GameScreen';
import PaperClouds from './PaperClouds';
import BrandMark from '../../shared/BrandMark';

// Hero：同一張卡片在「試算表」與「遊戲畫面」之間來回變形。
//
// 這是整頁唯一要在三秒內講完的那件事：**你填的那一列，就是玩家看到的那一頁。**
// 所以不是兩張圖並排加箭頭，而是同一個東西變成另一個東西——
// 「謎之音」「你醒啦！」兩格用 layoutId 綁在一起，從格子裡飛到對話框上。

const COLUMNS = [
  { key: 'model', width: '6.4em' },
  { key: 'speaker', width: '4.6em' },
  { key: 'text', width: '1fr' },
];
const ROWS = [
  { rowNo: 2, cells: { model: 'GameStart', speaker: '', text: '' } },
  { rowNo: 3, cells: { model: 'Talk', speaker: '謎之音', text: '你醒啦！' } },
  { rowNo: 4, cells: { model: 'Talk', speaker: '玩家.', text: '你是誰？我在哪？' } },
  { rowNo: 5, cells: { model: 'Talk', speaker: '謎之音', text: '我怎麼知道你是誰？你又沒告訴我' } },
  { rowNo: 6, cells: { model: 'Talk', speaker: '謎之音', text: '而且，你是誰不重要…' } },
];
const IDS = { speaker: 'hero-speaker', text: 'hero-text' };

const SPRING = { type: 'spring', stiffness: 170, damping: 24 };

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

const Morph = () => {
  const reduce = useReducedMotion();
  const [view, setView] = useState('sheet');
  const [paused, setPaused] = useState(false);

  // 自動來回切換；滑鼠停在上面時暫停，讓人看清楚。偏好減少動態的人不自動播。
  useEffect(() => {
    if (reduce || paused) return undefined;
    const id = setTimeout(() => setView((v) => (v === 'sheet' ? 'game' : 'sheet')), view === 'sheet' ? 2600 : 3600);
    return () => clearTimeout(id);
  }, [view, paused, reduce]);

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{ width: { xs: 300, sm: 360 }, mx: 'auto' }}
    >
      <Box
        sx={{
          height: { xs: 560, sm: 600 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <LayoutGroup id="hero">
          {view === 'sheet' ? (
            <motion.div
              key="sheet"
              layoutId="hero-frame"
              transition={SPRING}
              style={{ width: '100%', borderRadius: 14 }}
            >
              <MiniSheet
                id="hero"
                columns={COLUMNS}
                rows={ROWS}
                active={3}
                layoutIds={{ '3.speaker': IDS.speaker, '3.text': IDS.text }}
                sx={{ boxShadow: '0 24px 60px -30px rgba(15,23,42,.35)' }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="game"
              layoutId="hero-frame"
              transition={SPRING}
              style={{ borderRadius: 44 }}
            >
              <PhoneFrame width={{ xs: 250, sm: 270 }}>
                <GameScreen img="mizhiyin.jpg" speaker="謎之音" text="你醒啦！" typewriter={false} layoutIds={IDS} />
              </PhoneFrame>
            </motion.div>
          )}
        </LayoutGroup>
      </Box>

      {/* 切換鈕：也是說明「這兩個是同一個東西」的圖例 */}
      <Stack
        direction="row"
        sx={{
          mx: 'auto',
          width: 'fit-content',
          p: 0.5,
          borderRadius: 99,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {[
          ['sheet', '你填的試算表'],
          ['game', '玩家看到的畫面'],
        ].map(([v, label]) => (
          <Box
            key={v}
            component="button"
            type="button"
            onClick={() => setView(v)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              position: 'relative',
              // 底下那塊滑動的底色是 zIndex:-1——不在這裡隔離的話，它會沉到外框的
              // paper 底色後面，選中的字變成深字畫在深底上
              isolation: 'isolate',
              px: 2,
              py: 0.75,
              fontSize: '0.85rem',
              fontFamily: '"Noto Sans TC", sans-serif',
              color: view === v ? 'primary.contrastText' : 'text.secondary',
              transition: 'color 200ms',
              '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', borderRadius: 99 },
            }}
          >
            {view === v && (
              <Box
                component={motion.span}
                layoutId="hero-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                sx={{ position: 'absolute', inset: 0, borderRadius: 99, bgcolor: 'primary.main', zIndex: -1 }}
              />
            )}
            <Box component="span" sx={{ position: 'relative' }}>
              {label}
            </Box>
          </Box>
        ))}
      </Stack>
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
