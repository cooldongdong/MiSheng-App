import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
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

const INITIAL = {
  model: 'Talk',
  speaker: '旁白',
  text: '一口咬掉牛尾巴，猜一個字。',
};

// 兩種創作者真的會犯的錯：按下去，那一格就變成錯的
const MISTAKES = [
  { label: '角色名字打錯', patch: { speaker: '旁白君' } },
  { label: 'model 拼錯', patch: { model: 'Tlak' } },
];

// text 不用 1fr 撐滿整欄：一句對白用不到那麼寬，表太寬反而顯得格子小、看不出哪格能改
const COLUMNS = [
  { key: 'model', width: '7.5em' },
  { key: 'speaker', width: '7.5em' },
  { key: 'text', width: '1fr' },
];

// 可以動的格子長得像一個輸入框：底色、細框、右邊一個圖示。
// 第一版是虛線框＋格子裡的原生 select，Dong 的回饋是「看不出那裡可以編輯」「下拉好醜」
const field = {
  all: 'unset',
  boxSizing: 'border-box',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  py: 0.5,
  borderRadius: '8px',
  font: 'inherit',
  color: 'inherit',
  bgcolor: 'background.default',
  border: '1px solid',
  borderColor: (t) => `rgba(${t.vars.palette.secondary.mainChannel} / 0.45)`,
  transition: 'border-color 150ms, box-shadow 150ms',
  '&:hover': { borderColor: 'secondary.main' },
};
const fieldFocus = {
  borderColor: 'secondary.main',
  boxShadow: (t) => `0 0 0 3px rgba(${t.vars.palette.secondary.mainChannel} / 0.25)`,
};
const pulse = keyframes`
  0%, 60%, 100% { box-shadow: inset 0 0 0 0 transparent; }
  20% { box-shadow: inset 0 0 0 2px rgba(178, 89, 31, .6); }
`;
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
  const [menuAt, setMenuAt] = useState(null); // speaker 選單掛在哪一格
  const [touched, setTouched] = useState(false); // 動過任何一格就不再提示
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
          component="label"
          onClick={() => setTouched(true)}
          sx={{ ...field, cursor: 'text', '&:focus-within': fieldFocus }}
        >
          <Box
            component="input"
            value={cells.text}
            aria-label="rundown 表第 3 列的對白"
            onChange={(e) => setCells((c) => ({ ...c, text: e.target.value }))}
            sx={{ all: 'unset', flex: 1, minWidth: 0, font: 'inherit' }}
          />
          <EditRoundedIcon aria-hidden sx={{ fontSize: '1.1em', color: 'secondary.main', flexShrink: 0 }} />
        </Box>
      );
    }
    if (r.editable && key === 'speaker') {
      return (
        <Box
          component="button"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={Boolean(menuAt)}
          aria-label={`rundown 表第 3 列的 speaker：${cells.speaker}`}
          onClick={(e) => {
            setMenuAt(e.currentTarget);
            setTouched(true);
          }}
          sx={{ ...field, cursor: 'pointer', '&:focus-visible': fieldFocus }}
        >
          <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'left' }}>
            {cells.speaker}
          </Box>
          <ExpandMoreRoundedIcon aria-hidden sx={{ fontSize: '1.2em', color: 'secondary.main', flexShrink: 0 }} />
        </Box>
      );
    }
    return r.cells[key];
  };

  const cellSx = (r, key) => {
    if (r.rowNo !== ROW) return {};
    const editable = key === 'text' || key === 'speaker';
    if (flagged.has(`${ROW}.${key}`)) {
      return {
        ...(editable && { p: '3px' }),
        outline: '2px solid',
        outlineColor: 'error.main',
        outlineOffset: -2,
        bgcolor: tint('error', 0.12),
        color: 'error.main',
        fontWeight: 700,
      };
    }
    if (editable) {
      return {
        p: '3px',
        // 還沒動過之前，兩格輪流亮一下：告訴第一次來的人「這裡可以按」。動過一次就停
        ...(!touched && {
          '@media (prefers-reduced-motion: no-preference)': {
            animation: `${pulse} 2.4s ease-in-out infinite`,
            animationDelay: key === 'text' ? '1.2s' : '0s',
          },
        }),
      };
    }
    return {};
  };

  return (
    <Box component="section" sx={{ px: 2, py: { xs: 10, md: 16 } }}>
      {/* 標題放進左欄：手機的上緣跟標題切齊，不會在標題右邊空一大塊 */}
      <Box
        sx={{
          maxWidth: 1160,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gap: { xs: 5, md: 8 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.7rem', md: '2.6rem' },
              color: 'text.primary',
              lineHeight: 1.3,
            }}
          >
            改一格，手機就跟著變。
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              mt: 2,
              mb: 5,
              lineHeight: 1.9,
              maxWidth: 560,
            }}
          >
            這是一份試算表的其中一列。動手改改看。
          </Typography>

          <Stack spacing={1}>
            <Step n={1}>點 speaker 那格，換一個人說</Step>
            <Step n={2}>點 text 那格，改掉對白</Step>
          </Stack>
          <MiniSheet
            id="pg"
            columns={COLUMNS}
            rows={rows}
            active={ROW}
            renderCell={renderCell}
            cellSx={cellSx}
            sx={{ mt: 2.5, maxWidth: '38em', fontSize: { xs: '0.85rem', sm: '1.05rem' } }}
          />

          {/* speaker 的選單：選項＝character 表裡的名字，跟 Google 試算表「資料驗證」的下拉一樣只能選表裡有的 */}
          <Menu
            anchorEl={menuAt}
            open={Boolean(menuAt)}
            onClose={() => setMenuAt(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: -6, horizontal: 'left' }}
            slotProps={{
              paper: {
                elevation: 0,
                sx: {
                  minWidth: 180,
                  borderRadius: '14px',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 18px 40px -20px rgba(38,50,56,.5)',
                },
              },
              list: { role: 'listbox', sx: { p: 0.75 } },
            }}
          >
            <Typography sx={{ px: 1.25, pt: 0.5, pb: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>
              character 表裡的角色
            </Typography>
            {CHARACTERS.map((name) => {
              const on = cells.speaker === name;
              return (
                <MenuItem
                  key={name}
                  role="option"
                  aria-selected={on}
                  selected={on}
                  onClick={() => {
                    setCells((c) => ({ ...c, speaker: name, model: 'Talk' }));
                    setMenuAt(null);
                  }}
                  sx={{
                    borderRadius: '8px',
                    gap: 1,
                    fontWeight: on ? 700 : 400,
                    color: on ? 'secondary.main' : 'text.primary',
                    '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tint('secondary', 0.12) },
                  }}
                >
                  <Box component="span" sx={{ flex: 1 }}>
                    {name}
                  </Box>
                  {on && <CheckRoundedIcon sx={{ fontSize: '1.1rem' }} />}
                </MenuItem>
              );
            })}
          </Menu>

          {/* 填錯的示範 */}
          <Box
            sx={{
              mt: 5,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>填錯了會怎樣？</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              {MISTAKES.map((m) => (
                <Box
                  key={m.label}
                  component="button"
                  type="button"
                  onClick={() => setCells((c) => ({ ...c, ...m.patch }))}
                  sx={{
                    ...chip,
                    borderStyle: 'dashed',
                    borderColor: 'error.main',
                    color: 'error.main',
                  }}
                >
                  {m.label}
                </Box>
              ))}
              {broken && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setCells(INITIAL)}
                  sx={{
                    ...chip,
                    borderColor: 'transparent',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontWeight: 700,
                  }}
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
                        sx={{
                          p: 2,
                          mb: 1,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'error.main',
                          bgcolor: tint('error', 0.08),
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'error.main',
                          }}
                        >
                          {it.table} 表，第 {it.row} 列，{it.column} 欄
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.92rem',
                            color: 'text.primary',
                            mt: 0.5,
                            lineHeight: 1.7,
                          }}
                        >
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
        <Box
          sx={{
            justifySelf: 'center',
            position: { md: 'sticky' },
            top: { md: 96 },
          }}
        >
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
                    <Box
                      sx={{
                        opacity: 0.8,
                        mt: '0.6em',
                        lineHeight: 1.7,
                        fontSize: '0.85em',
                      }}
                    >
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
  );
};

export default Playground;
