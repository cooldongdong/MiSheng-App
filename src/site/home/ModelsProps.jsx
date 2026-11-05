import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import PhoneFrame from './PhoneFrame';
import ModelScreen from './ModelScreens';
import { MODELS, MODEL_NOTES } from './modelNotes';
import DiaryWheel from './art/DiaryWheel';
import { PropImgArt, PropCameraArt, PropOverlayArt } from './art/PropArt';
import { tint } from './tint';

// 第三段：能做出什麼。
//
// 前兩段講「一列＝一個畫面」，第一次來的人接著會問：那只能做對白嗎？
// 這段回答：model 欄有八種值，每一種是一種畫面；每一關還能放四種道具。
// 兩半都用「同一個欄位換一個值，東西就變了」的方式演，延續整頁的主線。

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 試算表的一格：欄名在上、值在下。值換掉時像翻牌一樣上下翻
const FlipCell = ({ label, value }) => (
  <Box
    sx={{
      display: 'inline-flex',
      flexDirection: 'column',
      minWidth: 260,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: '14px',
      overflow: 'hidden',
      bgcolor: 'background.paper',
      boxShadow: '0 12px 30px -18px rgba(38,50,56,.4)',
    }}
  >
    <Box sx={{ px: 2, py: 0.75, bgcolor: 'action.hover', fontSize: '0.8rem', color: 'text.secondary', fontFamily: MONO }}>
      {label}
    </Box>
    <Box sx={{ position: 'relative', height: 64, overflow: 'hidden', px: 2 }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          style={{ height: 64, display: 'flex', alignItems: 'center' }}
        >
          <Box component="span" sx={{ fontFamily: MONO, fontWeight: 700, fontSize: '1.6rem', color: 'secondary.main' }}>
            {value}
          </Box>
        </motion.div>
      </AnimatePresence>
    </Box>
  </Box>
);
FlipCell.propTypes = { label: PropTypes.string, value: PropTypes.string };

const Models = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const model = MODELS[i];

  // 看得到才自動翻；使用者點過任何一個之後就交給他，不再自己換
  useEffect(() => {
    if (!auto || !inView || reduce) return undefined;
    const id = setTimeout(() => setI((n) => (n + 1) % MODELS.length), 3200);
    return () => clearTimeout(id);
  }, [i, auto, inView, reduce]);

  return (
    <Box
      ref={ref}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
        gap: { xs: 5, md: 8 },
        alignItems: 'center',
      }}
    >
      <Box>
        <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: '1.7rem', md: '2.6rem' }, color: 'text.primary', lineHeight: 1.3 }}>
          八種畫面，
          <br />
          一個欄位決定。
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.9, maxWidth: 520 }}>
          rundown 表的 model 欄填什麼，那一列就變成什麼樣的畫面。
        </Typography>

        <Box sx={{ mt: 4 }}>
          <FlipCell label="model" value={model} />
        </Box>
        <Box sx={{ minHeight: 56, mt: 2 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={model}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <Typography sx={{ color: 'text.primary', lineHeight: 1.8 }}>{MODEL_NOTES[model]}</Typography>
            </motion.div>
          </AnimatePresence>
        </Box>

        {/* 八個值：點了就換，像試算表的下拉選單 */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, maxWidth: 560 }} role="tablist" aria-label="model 的八種值">
          {MODELS.map((m, n) => (
            <Box
              key={m}
              component="button"
              type="button"
              role="tab"
              aria-selected={n === i}
              onClick={() => {
                setI(n);
                setAuto(false);
              }}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                position: 'relative',
                isolation: 'isolate',
                px: 1.5,
                py: 0.75,
                borderRadius: 99,
                fontFamily: MONO,
                fontSize: '0.8rem',
                color: n === i ? 'secondary.contrastText' : 'text.secondary',
                border: '1px solid',
                borderColor: n === i ? 'transparent' : 'divider',
                transition: 'color 200ms',
                '&:hover': { color: n === i ? 'secondary.contrastText' : 'text.primary' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main' },
              }}
            >
              {n === i && (
                <Box
                  component={motion.span}
                  layoutId="model-tab"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  sx={{ position: 'absolute', inset: 0, borderRadius: 99, bgcolor: 'secondary.main', zIndex: -1 }}
                />
              )}
              {m}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ justifySelf: 'center' }}>
        <PhoneFrame width={{ xs: 240, md: 280 }}>
          <AnimatePresence initial={false}>
            <motion.div
              key={model}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <ModelScreen model={model} />
            </motion.div>
          </AnimatePresence>
        </PhoneFrame>
      </Box>
    </Box>
  );
};

// 四種道具：照 docs/sheet/prop.md 的說法
const PROPS = [
  { type: 'Wheel', note: '疊起來的圖層可以轉。轉到對的位置，才看得懂。', Art: DiaryWheel, area: 'wheel' },
  { type: 'Img', note: '一張圖。玩家可以點開放大、雙指縮放。', Art: PropImgArt, area: 'img' },
  { type: 'Camera', note: '打開相機，套上你做的框，拍一張帶走。', Art: PropCameraArt, area: 'camera' },
  {
    type: 'Overlay',
    note: '半透明的圖疊在相機畫面上，拿去對準現場帶不走的東西。',
    Art: PropOverlayArt,
    area: 'overlay',
  },
];

const Props = () => (
  <Box sx={{ mt: { xs: 12, md: 18 } }}>
    <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: '1.7rem', md: '2.6rem' }, color: 'text.primary', lineHeight: 1.3 }}>
      每一關，還能放道具。
    </Typography>
    <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.9, maxWidth: 560 }}>
      prop 表的 type 欄有四種值。玩家在那一關的「道具」頁看得到。
    </Typography>

    {/* 拼貼：Wheel 佔左邊兩列高，Overlay 佔右下兩欄寬。格數＝道具數，沒有空格 */}
    <Box
      sx={{
        mt: 5,
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr 1fr' },
        gridTemplateAreas: {
          xs: '"wheel" "img" "camera" "overlay"',
          md: '"wheel img camera" "wheel overlay overlay"',
        },
      }}
    >
      {PROPS.map(({ type, note, Art, area }, n) => (
        <Box
          key={type}
          component={motion.div}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: n * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          sx={{
            gridArea: area,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '20px',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* 插畫整張放進格子（contain）。留白處不會露出方框：插畫的底紙本來就往畫布外多鋪了一圈 */}
          <Box sx={{ position: 'relative', flex: 1, minHeight: { xs: 240, md: area === 'wheel' ? 440 : 230 } }}>
            <Box sx={{ position: 'absolute', inset: 0 }}>
              <Art fit="contain" />
            </Box>
          </Box>
          <Box sx={{ p: 2.5 }}>
            <Box
              component="code"
              sx={{
                fontFamily: MONO,
                fontSize: '0.8rem',
                fontWeight: 700,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: tint('secondary', 0.12),
                color: 'secondary.main',
              }}
            >
              type = {type}
            </Box>
            <Typography sx={{ color: 'text.primary', mt: 1.25, lineHeight: 1.8 }}>{note}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);

const ModelsProps = () => (
  <Box component="section" sx={{ px: 2, py: { xs: 10, md: 16 } }}>
    <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
      <Models />
      <Props />
    </Box>
  </Box>
);

export default ModelsProps;
