import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Stack, Typography } from '@mui/material';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import { AnimatePresence, motion } from 'motion/react';
import { validateGame } from '../../shared/validator/validateGame.js';
import { buildTables } from './playgroundTables';
import MiniSheet from './MiniSheet';
import { tint } from './tint';
import PhoneFrame from './PhoneFrame';
import GameScreen from './GameScreen';
import { STRAIGHT } from './demoImages';

// 第三段：改一格看看。
//
// 前兩段都是「看」，這段是「摸」：左邊的格子真的能打字，右邊的手機真的能答題，
// 填錯的時候**真的 validator** 會指出是哪張表哪一格——跟 /create 擋人的是同一顆。
// 這是謎生跟「把試算表塞進某個範本」最不一樣的地方，所以給它一個能親手弄壞的按鈕。

const INITIAL = {
  model: 'Talk',
  speaker: '旁白',
  text: '一口咬掉牛尾巴，猜一個字。',
  answer: '告',
};

// 「故意弄壞它」依序套用：每一種都是創作者真的會犯的錯
const BREAKS = [
  { patch: { speaker: '旁白君' }, label: '角色名字打錯' },
  { patch: { model: 'Tlak' }, label: 'model 拼錯' },
  { patch: { answer: '' }, label: '答案忘了填' },
];

const RUNDOWN_COLUMNS = [
  { key: 'model', width: '9.5em' },
  { key: 'speaker', width: '5.5em' },
  { key: 'text', width: '1fr' },
];
const MISSION_COLUMNS = [
  { key: 'id', width: '3.6em' },
  { key: 'title', width: '7em' },
  { key: 'answer', width: '1fr' },
];

const EDITABLE = { rundown: 3, mission: 2 };

const shake = {
  '@keyframes cellShake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '20%, 60%': { transform: 'translateX(-3px)' },
    '40%, 80%': { transform: 'translateX(3px)' },
  },
};

const CellInput = ({ value, onChange, label }) => (
  <Box
    component="input"
    value={value}
    aria-label={label}
    onChange={(e) => onChange(e.target.value)}
    sx={{
      all: 'unset',
      width: '100%',
      font: 'inherit',
      cursor: 'text',
      '&:focus': { color: 'secondary.main' },
    }}
  />
);
CellInput.propTypes = { value: PropTypes.string, onChange: PropTypes.func, label: PropTypes.string };

// 答對時炸開的小碎片
const Burst = () => (
  <Box sx={{ position: 'absolute', left: '50%', top: '42%', pointerEvents: 'none' }}>
    {Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      const r = 70 + (i % 3) * 18;
      return (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: i % 2 ? 2 : 99,
            background: i % 3 ? '#e08a4a' : '#fff',
          }}
        />
      );
    })}
  </Box>
);

const Phone = ({ cells, blocking }) => {
  const [screen, setScreen] = useState('talk'); // talk → answer → solved
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(0);

  const accepted = cells.answer.split('\n').map((s) => s.trim()).filter(Boolean);
  const submit = (e) => {
    e.preventDefault();
    // answer 空白＝不用答就過（這正是 validator 會提醒的那件事）
    if (accepted.length === 0 || accepted.includes(guess.trim())) setScreen('solved');
    else setWrong((n) => n + 1);
  };
  const restart = () => {
    setScreen('talk');
    setGuess('');
  };

  const btn = {
    all: 'unset',
    cursor: 'pointer',
    mt: '0.8em',
    px: '1em',
    py: '0.45em',
    borderRadius: 99,
    fontSize: '0.8em',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,.5)',
    '&:hover': { bgcolor: 'rgba(255,255,255,.12)' },
    '&:focus-visible': { outline: '2px solid #fff' },
  };

  return (
    <PhoneFrame width={{ xs: 250, sm: 280 }}>
      {screen === 'talk' && (
        <GameScreen img={STRAIGHT[cells.speaker]} speaker={cells.speaker} text={cells.text} typewriter={false}>
          <Box sx={{ textAlign: 'right' }}>
            <Box component="button" type="button" onClick={() => setScreen('answer')} sx={btn}>
              Next ▸
            </Box>
          </Box>
        </GameScreen>
      )}
      {screen !== 'talk' && (
        <GameScreen img="fengmian.jpg" speaker="第一章" text="旁白的字謎" typewriter={false}>
          {screen === 'answer' ? (
            <Box
              component={motion.form}
              key={wrong}
              onSubmit={submit}
              animate={wrong ? { x: [0, -8, 8, -6, 6, 0] } : {}}
              transition={{ duration: 0.35 }}
              sx={{
                mt: '0.6em',
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'dialogue.field',
                borderRadius: '0.6em',
                pl: '0.8em',
                fontSize: '0.85em',
              }}
            >
              <Box
                component="input"
                autoFocus
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="輸入答案"
                aria-label="輸入答案"
                sx={{ all: 'unset', flex: 1, color: '#263238', py: '0.55em', minWidth: 0 }}
              />
              <Box
                component="button"
                type="submit"
                sx={{ all: 'unset', cursor: 'pointer', px: '0.8em', color: 'dialogue.onField', fontWeight: 700 }}
              >
                送出
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '1.2em', mt: '0.3em', color: '#ffcf9e', fontFamily: 'inherit' }}>
                答對了！
              </Typography>
              <Box component="button" type="button" onClick={restart} sx={btn}>
                再玩一次
              </Box>
            </Box>
          )}
        </GameScreen>
      )}
      {screen === 'solved' && <Burst key={guess} />}

      {/* 有 error 時：不是白畫面，是一張講清楚哪裡錯的卡 */}
      <AnimatePresence>
        {blocking && (
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 4,
              bgcolor: 'rgba(16,20,24,.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: '10%',
              color: '#fff',
              fontSize: '5.2cqw',
              textAlign: 'center',
            }}
          >
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }}>
              <Box sx={{ fontSize: '2.2em', lineHeight: 1 }}>⚠︎</Box>
              <Box sx={{ fontWeight: 800, mt: '0.5em' }}>先擋下來了</Box>
              <Box sx={{ opacity: 0.75, mt: '0.4em', fontSize: '0.82em', lineHeight: 1.6 }}>
                這份試算表還有地方要修，
                <br />
                錯在哪一格，左邊寫得很清楚。
              </Box>
            </motion.div>
          </Box>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
};
Phone.propTypes = { cells: PropTypes.object.isRequired, blocking: PropTypes.bool };

const IssueList = ({ issues }) => (
  <Box sx={{ mt: 2, minHeight: 96 }}>
    <AnimatePresence mode="popLayout" initial={false}>
      {issues.length === 0 ? (
        <Box
          key="ok"
          component={motion.div}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main', fontSize: '0.95rem' }}
        >
          <Box component="span" sx={{ fontWeight: 800 }}>✓</Box>
          檢查通過，可以生成遊戲。
        </Box>
      ) : (
        issues.map((it) => {
          const color = it.level === 'error' ? 'error' : 'warning';
          return (
            <Box
              key={`${it.table}-${it.row}-${it.column}-${it.message}`}
              component={motion.div}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              sx={{
                p: 1.5,
                mb: 1,
                borderRadius: 2,
                border: '1px solid',
                borderColor: `${color}.main`,
                bgcolor: tint(color, 0.08),
              }}
            >
              <Box
                sx={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: `${color}.main`,
                  fontFamily: '"Noto Sans TC", sans-serif',
                }}
              >
                {it.level === 'error' ? '錯誤' : '提醒'} · {it.table} 表 · 第 {it.row} 列 · {it.column}
              </Box>
              <Typography sx={{ fontSize: '0.88rem', color: 'text.primary', mt: 0.5, lineHeight: 1.7, fontFamily: '"Noto Sans TC", sans-serif' }}>
                {it.message}
              </Typography>
            </Box>
          );
        })
      )}
    </AnimatePresence>
  </Box>
);
IssueList.propTypes = { issues: PropTypes.array.isRequired };

const Playground = () => {
  const [cells, setCells] = useState(INITIAL);
  const [breakIdx, setBreakIdx] = useState(0);
  const set = (k) => (v) => setCells((c) => ({ ...c, [k]: v }));

  const issues = useMemo(() => validateGame(buildTables(cells)), [cells]);
  const flagged = new Map(issues.map((it) => [`${it.table}.${it.row}.${it.column}`, it.level]));
  const blocking = issues.some((it) => it.level === 'error');

  const breakIt = () => {
    setCells((c) => ({ ...c, ...BREAKS[breakIdx % BREAKS.length].patch }));
    setBreakIdx((n) => n + 1);
  };
  const reset = () => {
    setCells(INITIAL);
    setBreakIdx(0);
  };

  const sxFor = (table) => (r, key) => {
    const level = flagged.get(`${table}.${r.rowNo}.${key}`);
    const editable = r.rowNo === EDITABLE[table] && r.editable?.includes(key);
    return {
      ...(editable && { bgcolor: tint('secondary', 0.06), cursor: 'text' }),
      ...(level && {
        ...shake,
        outline: '2px solid',
        outlineColor: level === 'error' ? 'error.main' : 'warning.main',
        outlineOffset: -2,
        bgcolor: tint(level === 'error' ? 'error' : 'warning', 0.12),
        animation: 'cellShake 400ms',
      }),
    };
  };

  const render = (table) =>
    function renderCell(r, key) {
      return r.editable?.includes(key) ? (
      <CellInput value={cells[key]} onChange={set(key)} label={`${table} 表 第 ${r.rowNo} 列 ${key}`} />
    ) : (
      r.cells[key]
    );
    };

  const rundownRows = [
    { rowNo: 2, cells: { model: 'GameStart', speaker: '', text: '' } },
    { rowNo: 3, cells: {}, editable: ['model', 'speaker', 'text'] },
    { rowNo: 4, cells: { model: 'MissionStart', speaker: '', text: '' } },
    { rowNo: 5, cells: { model: 'MissionAnswerInput', speaker: '', text: '' } },
  ];
  const missionRows = [{ rowNo: 2, cells: { id: '1', title: '旁白的字謎' }, editable: ['answer'] }];

  return (
    <Box component="section" sx={{ px: 2, py: { xs: 10, md: 16 } }}>
      <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2.4rem' }, mt: 1, color: 'text.primary' }}>
            改一格，遊戲就跟著變。
            <br />
            填錯了，它會告訴你是哪一格。
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.9, maxWidth: 640 }}>
            底色淡橘的格子都可以直接打字。改改對白、換個 speaker，在手機裡把謎題解開——
            或者按「故意弄壞它」，看看謎生怎麼把問題指給你看。
          </Typography>
        </motion.div>

        <Box
          sx={{
            mt: 6,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
            gap: { xs: 5, md: 8 },
            alignItems: 'start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled', mb: 1 }}>rundown 表</Typography>
            <MiniSheet
              id="pg-rundown"
              columns={RUNDOWN_COLUMNS}
              rows={rundownRows}
              active={3}
              renderCell={render('rundown')}
              cellSx={sxFor('rundown')}
            />
            <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled', mt: 2.5, mb: 1 }}>mission 表</Typography>
            <MiniSheet
              id="pg-mission"
              tab="mission"
              columns={MISSION_COLUMNS}
              rows={missionRows}
              renderCell={render('mission')}
              cellSx={sxFor('mission')}
            />

            <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
              <Button
                onClick={breakIt}
                startIcon={<BuildRoundedIcon />}
                variant="outlined"
                color="error"
                sx={{ borderRadius: 99, textTransform: 'none' }}
              >
                故意弄壞它：{BREAKS[breakIdx % BREAKS.length].label}
              </Button>
              <Button
                onClick={reset}
                startIcon={<RestartAltRoundedIcon />}
                sx={{ borderRadius: 99, textTransform: 'none', color: 'text.secondary' }}
              >
                復原
              </Button>
            </Stack>

            <IssueList issues={issues} />
          </Box>

          <Box sx={{ justifySelf: 'center', position: { md: 'sticky' }, top: { md: 96 } }}>
            <Phone cells={cells} blocking={blocking} />
            <Typography sx={{ textAlign: 'center', fontSize: '0.8rem', color: 'text.disabled', mt: 2 }}>
              提示：答案就在題目裡。
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Playground;
