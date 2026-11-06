import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import FolderZipRoundedIcon from '@mui/icons-material/FolderZipRounded';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import PhoneFrame from './PhoneFrame';
import PlayerScreen from './PlayerScreen';
import { INK } from './art/palette';
import { tint } from './tint';

// 第五段：怎麼開始用。兩條路：
//   Google 試算表＋/create   不用安裝，絕大多數人走這條，所以是預設
//   在自己電腦跑            想改播放器本身的人
// 內容照 docs/start/quickstart.md、docs/publish/deploy.md 與 README 的 Installation 寫，
// 那幾份改了這裡要跟著看。
//
// 左邊是步驟，右邊一個視窗演那一步：試算表那條是瀏覽器，本地那條是終端機。
// 兩條路用同一個視窗外框，切換時只換內容，看得出是「同一件事的兩種做法」。

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const GITHUB_URL = 'https://github.com/cooldongdong/MiSheng-App';

const PATHS = {
  sheet: {
    label: 'Google 試算表',
    tag: '不用安裝',
    steps: [
      { title: '複製範本試算表', note: '從 demo 的資料開始改，七張表的欄位都已經在那裡了。' },
      { title: '改三個地方', note: '遊戲名稱、對白、答案。其他欄位先不用管，留著 demo 的內容也不會壞。' },
      { title: '貼進 /create 試玩', note: '共用權限開成「知道連結的人都可以檢視」。貼上連結，當場檢查，通過就能玩。' },
      { title: '匯出，放上網', note: '按「匯出可上架的遊戲」拿到一個 zip，拖進 Cloudflare 就上線了。' },
    ],
  },
  local: {
    label: '在自己電腦跑',
    tag: '想改程式的人',
    steps: [
      { title: '下載專案', note: '記得帶 --recurse-submodules，它會一起抓 demo 遊戲。少了它，/demo 是空白的。' },
      { title: '安裝套件', note: '需要 Node.js。' },
      { title: '放進你的遊戲', note: '資料夾丟進 src/gameFile/，檔名照 demo 的格式：「資料夾名 - rundown.csv」。' },
      { title: '跑起來', note: '打開終端機給的網址，加上 /demo。' },
    ],
  },
};

// ── 瀏覽器那條：每一步一個畫面 ─────────────────────────────

const pop = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

const Cell = ({ tab, col, value, delay }) => (
  <Box component={motion.div} {...pop} transition={{ ...pop.transition, delay }} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
    <Box sx={{ fontFamily: MONO, fontSize: '0.72rem', color: 'text.secondary', width: '10em', flexShrink: 0, whiteSpace: 'nowrap' }}>
      {tab} · {col}
    </Box>
    <Box
      sx={{
        flex: 1,
        px: 1.25,
        py: 0.75,
        border: '2px solid',
        borderColor: 'secondary.main',
        borderRadius: '6px',
        bgcolor: tint('secondary', 0.08),
        fontSize: '0.9rem',
        fontWeight: 700,
        color: 'text.primary',
      }}
    >
      {value}
    </Box>
  </Box>
);
Cell.propTypes = { tab: PropTypes.string, col: PropTypes.string, value: PropTypes.string, delay: PropTypes.number };

const SheetGrid = () => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '2em repeat(3, 1fr)', fontSize: '0.72rem', color: 'text.secondary' }}>
    {Array.from({ length: 20 }, (_, n) => (
      <Box
        key={n}
        sx={{
          height: 26,
          borderRight: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: n < 4 || n % 4 === 0 ? 'action.hover' : 'transparent',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {n % 4 === 0 && n > 0 ? n / 4 : n > 0 && n < 4 ? String.fromCharCode(64 + n) : ''}
      </Box>
    ))}
  </Box>
);

const BROWSER = [
  {
    url: 'docs.google.com/spreadsheets/…',
    Body: () => (
      <Box sx={{ position: 'relative' }}>
        <SheetGrid />
        <Box
          component={motion.div}
          {...pop}
          transition={{ ...pop.transition, delay: 0.5 }}
          sx={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            px: 1.5,
            py: 1,
            borderRadius: '8px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 12px 24px -12px rgba(38,50,56,.5)',
            fontSize: '0.85rem',
          }}
        >
          檔案 → <b>建立副本</b>
        </Box>
      </Box>
    ),
  },
  {
    url: 'docs.google.com/spreadsheets/…',
    Body: () => (
      <Box sx={{ display: 'grid', gap: 1.5, py: 1 }}>
        <Cell tab="config" col="title" value="我的第一款遊戲" delay={0.1} />
        <Cell tab="rundown" col="text" value="歡迎來到老街。" delay={0.5} />
        <Cell tab="mission" col="answer" value="告" delay={0.9} />
      </Box>
    ),
  },
  {
    url: 'misheng.app/create',
    Body: () => (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, alignItems: 'center' }}>
        <Box>
          <Box
            sx={{
              px: 1.25,
              py: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '8px',
              fontFamily: MONO,
              fontSize: '0.72rem',
              color: 'text.secondary',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <motion.span
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 0.8, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              https://docs.google.com/spreadsheets/d/1x…
            </motion.span>
          </Box>
          <Box
            component={motion.div}
            {...pop}
            transition={{ ...pop.transition, delay: 1 }}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1.5, color: 'success.main', fontWeight: 700, fontSize: '0.9rem' }}
          >
            <CheckRoundedIcon fontSize="small" /> 檢查通過，可以試玩
          </Box>
        </Box>
        <Box component={motion.div} {...pop} transition={{ ...pop.transition, delay: 1.3 }}>
          <PhoneFrame width={118} sx={{ p: '6px', borderRadius: '22px', '& > div': { borderRadius: '17px' } }}>
            <PlayerScreen page={{ model: 'Talk', speaker: '謎之音', text: '歡迎來到老街。' }} typewriter={false} />
          </PhoneFrame>
        </Box>
      </Box>
    ),
  },
  {
    url: 'dash.cloudflare.com',
    Body: () => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 170 }}>
        <Box
          component={motion.div}
          initial={{ x: 0, rotate: 0 }}
          animate={{ x: [0, 0, 150], rotate: [0, -6, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 1.4, times: [0, 0.3, 1], ease: [0.45, 0, 0.2, 1] }}
          sx={{
            width: 96,
            flexShrink: 0,
            p: 1.25,
            textAlign: 'center',
            borderRadius: '8px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 10px 20px -12px rgba(38,50,56,.5)',
            fontSize: '0.75rem',
            zIndex: 1,
          }}
        >
          <FolderZipRoundedIcon sx={{ color: 'secondary.main', fontSize: 36 }} />
          <Box>我的遊戲.zip</Box>
        </Box>
        <Box
          sx={{
            flex: 1,
            alignSelf: 'stretch',
            display: 'grid',
            placeItems: 'center',
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: '12px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'text.secondary',
          }}
        >
          <Box>
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.2, duration: 0.2 }}>
              拖到這裡
            </motion.div>
            <Box component={motion.div} {...pop} transition={{ ...pop.transition, delay: 1.4 }} sx={{ mt: -2.5 }}>
              <Box sx={{ color: 'success.main', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <CheckRoundedIcon fontSize="small" /> 上線了
              </Box>
              <Box sx={{ fontFamily: MONO, fontSize: '0.72rem', mt: 0.5 }}>my-game.workers.dev</Box>
            </Box>
          </Box>
        </Box>
      </Box>
    ),
  },
];

// ── 終端機那條：指令一行一行累積下去 ─────────────────────────

const TERMINAL = [
  { cmd: `git clone --recurse-submodules ${GITHUB_URL}`, out: ['Cloning into \'MiSheng-App\'…', 'Submodule \'src/gameFile/demo\' … done.'] },
  { cmd: 'cd MiSheng-App && npm install', out: ['added … packages'] },
  {
    cmd: 'ls src/gameFile/my-game',
    out: ['my-game - rundown.csv', 'my-game - mission.csv', 'my-game - character.csv', '… 共七張表', 'img/'],
  },
  { cmd: 'npm run dev', out: ['VITE ready', '➜  Local:   http://localhost:5173/'] },
];

const Typed = ({ text }) => {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? false : { clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: Math.min(1.2, text.length * 0.025), ease: 'linear' }}
      style={{ display: 'inline-block', whiteSpace: 'pre' }}
    >
      {text}
    </motion.span>
  );
};
Typed.propTypes = { text: PropTypes.string };

const Terminal = ({ step }) => (
  <Box sx={{ fontFamily: MONO, fontSize: { xs: '0.68rem', sm: '0.76rem' }, lineHeight: 1.8, color: INK.paper, overflow: 'hidden' }}>
    {TERMINAL.slice(0, step + 1).map((t, n) => {
      const current = n === step;
      return (
        <Box key={t.cmd} sx={{ opacity: current ? 1 : 0.45, mb: 1 }}>
          <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Box component="span" sx={{ color: INK.rustLight }}>$ </Box>
            {current ? <Typed text={t.cmd} /> : t.cmd}
          </Box>
          {t.out.map((line, k) => (
            <Box
              key={line}
              component={motion.div}
              initial={current ? { opacity: 0 } : false}
              animate={{ opacity: 0.75 }}
              transition={{ delay: current ? 0.9 + k * 0.12 : 0 }}
              sx={{ pl: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {line}
            </Box>
          ))}
        </Box>
      );
    })}
  </Box>
);
Terminal.propTypes = { step: PropTypes.number };

// ── 共用的視窗外框 ─────────────────────────────────────────

const Window = ({ dark, title, children }) => (
  <Box
    sx={{
      borderRadius: '14px',
      overflow: 'hidden',
      border: '1px solid',
      borderColor: dark ? INK.ink : 'divider',
      bgcolor: dark ? INK.ink : 'background.paper',
      boxShadow: '0 24px 50px -30px rgba(38,50,56,.55)',
      rotate: '1deg',
    }}
  >
    <Box
      sx={{
        px: 1.5,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: dark ? 'rgba(255,255,255,.06)' : 'action.hover',
        borderBottom: '1px solid',
        borderColor: dark ? 'rgba(255,255,255,.08)' : 'divider',
      }}
    >
      <Box
        sx={{
          flex: 1,
          px: 1.25,
          py: 0.35,
          borderRadius: 99,
          fontFamily: MONO,
          fontSize: '0.72rem',
          color: dark ? INK.line : 'text.secondary',
          bgcolor: dark ? 'transparent' : 'background.paper',
          textAlign: dark ? 'center' : 'left',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </Box>
    </Box>
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>{children}</Box>
  </Box>
);
Window.propTypes = { dark: PropTypes.bool, title: PropTypes.string, children: PropTypes.node };

// ── 段落本體 ────────────────────────────────────────────────

const HowTo = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [path, setPath] = useState('sheet');
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const { steps } = PATHS[path];

  // 看得到才自動往下走；點過任何一步就交給使用者
  useEffect(() => {
    if (!auto || !inView || reduce) return undefined;
    const id = setTimeout(() => setStep((n) => (n + 1) % steps.length), 3600);
    return () => clearTimeout(id);
  }, [step, auto, inView, reduce, steps.length]);

  const Body = BROWSER[step].Body;

  return (
    <Box component="section" id="start" sx={{ px: 2, py: { xs: 10, md: 16 } }}>
      <Box ref={ref} sx={{ maxWidth: 1160, mx: 'auto' }}>
        <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: '1.7rem', md: '2.6rem' }, color: 'text.primary', lineHeight: 1.3 }}>
          兩種開始的方式。
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.9, maxWidth: 560 }}>
          只想做遊戲，用 Google 試算表就夠了。想改播放器本身，再把整個專案抓下來跑。
        </Typography>

        {/* 兩條路的切換 */}
        <Box
          role="tablist"
          aria-label="開始的方式"
          sx={{
            mt: 5,
            display: 'inline-flex',
            p: 0.5,
            borderRadius: 99,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {Object.entries(PATHS).map(([key, p]) => {
            const on = key === path;
            return (
              <Box
                key={key}
                component="button"
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setPath(key);
                  setStep(0);
                  setAuto(true);
                }}
                sx={{
                  all: 'unset',
                  cursor: 'pointer',
                  position: 'relative',
                  isolation: 'isolate',
                  px: { xs: 1.5, sm: 2.25 },
                  py: 0.9,
                  textAlign: 'center',
                  color: on ? 'primary.contrastText' : 'text.secondary',
                  transition: 'color 200ms',
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', borderRadius: 99 },
                }}
              >
                {on && (
                  <Box
                    component={motion.span}
                    layoutId="howto-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    sx={{ position: 'absolute', inset: 0, borderRadius: 99, bgcolor: 'primary.main', zIndex: -1 }}
                  />
                )}
                <Box component="span" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {p.label}
                </Box>
                <Box component="span" sx={{ fontSize: '0.75rem', opacity: 0.75, ml: 1, display: { xs: 'block', sm: 'inline' } }}>
                  {p.tag}
                </Box>
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            mt: 5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.15fr' },
            gap: { xs: 4, md: 8 },
            alignItems: 'start',
          }}
        >
          {/* 步驟：點了就跳到那一步 */}
          <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {steps.map((s, n) => {
              const on = n === step;
              return (
                <Box component="li" key={`${path}-${s.title}`}>
                  <Box
                    component="button"
                    type="button"
                    aria-current={on ? 'step' : undefined}
                    onClick={() => {
                      setStep(n);
                      setAuto(false);
                    }}
                    sx={{
                      all: 'unset',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '32px 1fr',
                      gap: 1.75,
                      py: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 900,
                        fontSize: '0.9rem',
                        transition: 'all 250ms',
                        bgcolor: on ? 'secondary.main' : 'transparent',
                        color: on ? 'secondary.contrastText' : 'text.disabled',
                        border: '1.5px solid',
                        borderColor: on ? 'secondary.main' : 'divider',
                      }}
                    >
                      {n + 1}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: on ? 'text.primary' : 'text.secondary', lineHeight: 2 }}>
                        {s.title}
                      </Typography>
                      {/* 說明只在目前這一步展開，其他收著：一次只讀一件事 */}
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <Typography sx={{ color: 'text.secondary', lineHeight: 1.8, mt: 0.5 }}>{s.note}</Typography>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* 視窗：演目前這一步 */}
          <Box sx={{ minWidth: 0 }}>
            {path === 'sheet' ? (
              <Window title={BROWSER[step].url}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Body />
                  </motion.div>
                </AnimatePresence>
              </Window>
            ) : (
              <Window dark title="Terminal">
                <Terminal step={step} />
              </Window>
            )}
            <Typography sx={{ mt: 2.5, fontSize: '0.9rem', color: 'text.secondary' }}>
              每一步的細節都在{' '}
              <Box component="a" href={path === 'sheet' ? '/docs/start/quickstart' : GITHUB_URL} sx={{ color: 'secondary.main', fontWeight: 700 }}>
                {path === 'sheet' ? '文件' : 'GitHub 的 README'}
              </Box>
              。
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HowTo;
