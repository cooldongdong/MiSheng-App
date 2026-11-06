import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { AnimatePresence, motion } from 'motion/react';
import { validateGame } from '../../shared/validator/validateGame.js';
import { buildTables, CHARACTERS } from './playgroundTables';
import MiniSheet from './MiniSheet';
import PhoneFrame from './PhoneFrame';
import PlayerScreen from './PlayerScreen';
import { tint } from './tint';

// 第四段：改一格看看。
//
// 第一版太複雜：兩張表、四格可改、手機要按 Next 再解謎、一顆會輪流換錯法的按鈕。
// Dong 的回饋是「不是很好理解要怎麼操作」——問題不在功能少，在**每一步要做什麼沒有寫在旁邊**。
// 這一版只留兩個動作，旁邊直接標 ① ②；填錯的示範拆成兩顆各自講清楚錯在哪的按鈕。
//
// 錯誤訊息仍然接真的 validateGame（理由見 playgroundTables.js）。

const INITIAL = { model: 'Talk', speaker: '旁白', text: '一口咬掉牛尾巴，猜一個字。' };

// 兩種創作者真的會犯的錯：按下去，那一格就變成錯的
const MISTAKES = [
  { label: '角色名字打錯', patch: { speaker: '旁白君' } },
  { label: 'model 拼錯', patch: { model: 'Tlak' } },
];

const COLUMNS = [
  { key: 'model', width: '9.5em' },
  { key: 'speaker', width: '6.5em' },
  { key: 'text', width: '1fr' },
];
const ROW = 3; // 可以改的那一列（試算表列號）

const Step = ({ n, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
    <Box
      sx={{
        width: 28,
        height: 28,
        flexShrink: 0,
        borderRadius: '50%',
        bgcolor: 'secondary.main',
        color: 'secondary.contrastText',
        fontWeight: 900,
        display: 'grid',
        placeItems: 'center',
        fontSize: '0.9rem',
      }}
    >
      {n}
    </Box>
    <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{children}</Typography>
  </Box>
);
Step.propTypes = { n: PropTypes.number, children: PropTypes.node };

const chip = {
  all: 'unset',
  cursor: 'pointer',
  px: 2,
  py: 0.75,
  borderRadius: 99,
  border: '1px solid',
  '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main' },
  '&:active': { transform: 'translateY(1px)' },
};

const Playground = () => {
  const [cells, setCells] = useState(INITIAL);
  const issues = useMemo(() => validateGame(buildTables({ ...cells, answer: '告' })), [cells]);
  const errors = issues.filter((it) => it.level === 'error');
  const flagged = new Set(errors.map((it) => `${it.row}.${it.column}`));
  const broken = errors.length > 0;

  const rows = [
    { rowNo: 2, cells: { model: 'GameStart', speaker: '', text: '' } },
    { rowNo: ROW, cells, editable: true },
    { rowNo: 4, cells: { model: 'MissionStart', speaker: '', text: '' } },
  ];

  const renderCell = (r, key) => {
    if (r.editable && key === 'text') {
      return (
        <Box
          component="input"
          value={cells.text}
          aria-label="rundown 表第 3 列的對白"
          onChange={(e) => setCells((c) => ({ ...c, text: e.target.value }))}
          sx={{ all: 'unset', width: '100%', font: 'inherit', cursor: 'text' }}
        />
      );
    }
    return r.cells[key];
  };

  const cellSx = (r, key) => {
    if (r.rowNo !== ROW) return {};
    if (flagged.has(`${ROW}.${key}`)) {
      return {
        outline: '2px solid',
        outlineColor: 'error.main',
        outlineOffset: -2,
        bgcolor: tint('error', 0.12),
        color: 'error.main',
        fontWeight: 700,
      };
    }
    // 可以打字的那一格：虛線框，跟步驟 ① 的說法對得上
    if (key === 'text') {
      return { outline: '2px dashed', outlineColor: 'secondary.main', outlineOffset: -3, bgcolor: tint('secondary', 0.08) };
    }
    return {};
  };

  return (
    <Box component="section" sx={{ px: 2, py: { xs: 10, md: 16 } }}>
      <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
        <Typography
          component="h2"
          sx={{ fontWeight: 900, fontSize: { xs: '1.7rem', md: '2.6rem' }, color: 'text.primary', lineHeight: 1.3 }}
        >
          改一格，手機就跟著變。
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.9, maxWidth: 560 }}>
          這是一份試算表的其中一列。動手改改看。
        </Typography>

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
            <Step n={1}>點虛線框那一格，改掉對白</Step>
            <MiniSheet id="pg" columns={COLUMNS} rows={rows} active={ROW} renderCell={renderCell} cellSx={cellSx} sx={{ mt: 1.5 }} />

            <Box sx={{ mt: 4 }}>
              <Step n={2}>換一個人說</Step>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {CHARACTERS.map((name) => {
                  const on = cells.speaker === name;
                  return (
                    <Box
                      key={name}
                      component="button"
                      type="button"
                      aria-pressed={on}
                      onClick={() => setCells((c) => ({ ...c, speaker: name, model: 'Talk' }))}
                      sx={{
                        ...chip,
                        borderColor: on ? 'secondary.main' : 'divider',
                        bgcolor: on ? tint('secondary', 0.12) : 'transparent',
                        color: on ? 'secondary.main' : 'text.primary',
                        fontWeight: on ? 700 : 400,
                      }}
                    >
                      {name}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            {/* 填錯的示範 */}
            <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>填錯了會怎樣？</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {MISTAKES.map((m) => (
                  <Box
                    key={m.label}
                    component="button"
                    type="button"
                    onClick={() => setCells((c) => ({ ...c, ...m.patch }))}
                    sx={{ ...chip, borderStyle: 'dashed', borderColor: 'error.main', color: 'error.main' }}
                  >
                    {m.label}
                  </Box>
                ))}
                {broken && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setCells(INITIAL)}
                    sx={{ ...chip, borderColor: 'transparent', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}
                  >
                    改回來
                  </Box>
                )}
              </Box>

              {/* validator 說的話：哪張表、第幾列、哪一欄 */}
              <Box sx={{ minHeight: 120, mt: 2 }}>
                <AnimatePresence mode="wait" initial={false}>
                  {broken ? (
                    <motion.div
                      key={errors.map((it) => it.message).join('|')}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {errors.map((it) => (
                        <Box
                          key={it.message}
                          sx={{ p: 2, mb: 1, borderRadius: 2, border: '1px solid', borderColor: 'error.main', bgcolor: tint('error', 0.08) }}
                        >
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'error.main' }}>
                            {it.table} 表，第 {it.row} 列，{it.column} 欄
                          </Typography>
                          <Typography sx={{ fontSize: '0.92rem', color: 'text.primary', mt: 0.5, lineHeight: 1.7 }}>
                            {it.message}
                          </Typography>
                        </Box>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Typography sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                        謎生在生成遊戲之前，會先檢查整份試算表。按上面任一個，看它怎麼指出錯在哪一格。
                      </Typography>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Box>
          </Box>

          {/* 手機：即時跟著格子變；有錯就擋下來 */}
          <Box sx={{ justifySelf: 'center', position: { md: 'sticky' }, top: { md: 96 } }}>
            <PhoneFrame width={{ xs: 250, sm: 280 }}>
              <PlayerScreen page={{ model: 'Talk', speaker: cells.speaker, text: cells.text }} typewriter={false} />
              <AnimatePresence>
                {broken && (
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 4,
                      bgcolor: 'rgba(16,20,24,.78)',
                      backdropFilter: 'blur(6px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: '12%',
                      color: '#fff',
                      fontSize: '5.2cqw',
                      textAlign: 'center',
                    }}
                  >
                    <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }}>
                      <Box sx={{ fontWeight: 900, fontSize: '1.2em' }}>先擋下來了</Box>
                      <Box sx={{ opacity: 0.8, mt: '0.6em', lineHeight: 1.7, fontSize: '0.85em' }}>
                        不會丟一個白畫面給你。
                        <br />
                        錯在哪一格，左邊寫著。
                      </Box>
                    </motion.div>
                  </Box>
                )}
              </AnimatePresence>
            </PhoneFrame>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Playground;
