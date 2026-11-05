import { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import MiniSheet from './MiniSheet';
import { tint } from './tint';
import PhoneFrame from './PhoneFrame';
import GameScreen from './GameScreen';

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

const HEADLINE = [
  { text: '把一份試算表，', accent: false },
  { text: '變成手機就能玩的', accent: false, br: true },
  { text: '實境解謎。', accent: true },
];

// 標題逐字浮現。用字元而不是整行，是為了讓「打字」的語感跟遊戲的打字機對白呼應
const Headline = () => {
  let i = 0;
  return (
    <Typography
      component="h1"
      sx={{
        fontWeight: 800,
        fontSize: { xs: '2.2rem', sm: '3rem', md: '3.4rem' },
        lineHeight: 1.25,
        letterSpacing: '0.01em',
        color: 'text.primary',
      }}
    >
      {HEADLINE.map((seg) => [
        seg.br && <br key={`${seg.text}-br`} />,
        <Box
          key={seg.text}
          component="span"
          // 每一段不准從中間斷行：「實境／解謎」被拆兩行，重點就斷了
          sx={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap', color: seg.accent ? 'secondary.main' : 'inherit' }}
        >
          {[...seg.text].map((ch) => {
            const d = 0.15 + i++ * 0.035;
            return (
              <motion.span
                key={`${seg.text}-${d}`}
                initial={{ opacity: 0, y: '0.35em', filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: d, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'inline-block' }}
              >
                {ch}
              </motion.span>
            );
          })}
          {seg.accent && (
            // 底線畫出來：解謎的「圈起重點」
            <Box
              component={motion.span}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.15 + i * 0.035 + 0.2, duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
              sx={{
                position: 'absolute',
                left: 0,
                right: '0.9em',
                bottom: '0.02em',
                height: '0.12em',
                borderRadius: 1,
                bgcolor: tint('secondary', 0.35),
                transformOrigin: 'left',
              }}
            />
          )}
        </Box>,
      ])}
    </Typography>
  );
};

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

// 背景：試算表的格線，滑鼠移到哪亮到哪。
// 位置寫進 CSS 變數，不進 React state——游標每動一下都 re-render 整個 hero 不值得。
const useSpotlight = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, []);
  return ref;
};

const grid = (t, a) =>
  `linear-gradient(rgba(${t.vars.palette.text.primaryChannel} / ${a}) 1px, transparent 1px) 0 0 / 44px 44px,
   linear-gradient(90deg, rgba(${t.vars.palette.text.primaryChannel} / ${a}) 1px, transparent 1px) 0 0 / 44px 44px`;

const Hero = () => {
  const ref = useSpotlight();
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
        py: { xs: 10, md: 6 },
        '--mx': '70%',
        '--my': '40%',
        // 底層：淡淡的格線，往邊緣淡出
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: (t) => grid(t, 0.06),
          maskImage: 'radial-gradient(ellipse at 50% 40%, #000 30%, transparent 75%)',
          pointerEvents: 'none',
        },
        // 上層：游標附近的格線比較亮
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: (t) => grid(t, 0.16),
          maskImage: 'radial-gradient(240px circle at var(--mx) var(--my), #000, transparent 70%)',
          pointerEvents: 'none',
        },
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 4 }}>
              MISHENG · 謎生
            </Typography>
          </motion.div>
          <Box sx={{ mt: 1.5 }}>
            <Headline />
          </Box>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            <Typography sx={{ color: 'text.secondary', fontSize: '1.1rem', mt: 3, lineHeight: 1.9, maxWidth: 520 }}>
              一列對白，就是一個畫面。填好試算表，貼上連結，手機掃一下就開玩——
              不用寫程式，也不用架伺服器。
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button
                href="/create"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{ borderRadius: 99, px: 3.5, py: 1.4, textTransform: 'none', fontSize: '1rem', boxShadow: 'none' }}
              >
                把你的試算表變成遊戲
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
                  color: 'text.primary',
                  borderColor: 'divider',
                  '&:hover': { borderColor: 'text.secondary' },
                }}
              >
                先玩 demo
              </Button>
            </Stack>
          </motion.div>
        </Box>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <Morph />
        </motion.div>
      </Box>

      {/* 往下捲的提示 */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 1.6 }, y: { delay: 1.6, duration: 1.8, repeat: Infinity } }}
        sx={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          translate: '-50% 0',
          fontSize: '0.8rem',
          color: 'text.disabled',
          letterSpacing: 2,
          display: { xs: 'none', md: 'block' },
          zIndex: 1,
        }}
      >
        往下看它怎麼運作 ↓
      </Box>
    </Box>
  );
};

export default Hero;
