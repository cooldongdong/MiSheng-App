import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useInView, useReducedMotion } from 'motion/react';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import HomeRepairServiceRoundedIcon from '@mui/icons-material/HomeRepairServiceRounded';
import QuestionAnswerRoundedIcon from '@mui/icons-material/QuestionAnswerRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import PhoneFrame from './PhoneFrame';
import PlayerScreen from './PlayerScreen';
import Libai from './art/Libai';
import Mizhiyin from './art/Mizhiyin';
import DiaryWheel from './art/DiaryWheel';
import { PropCameraArt, PropImgArt } from './art/PropArt';
import { tint } from './tint';

// 導覽列那一段：手機下面那一排五顆，各是什麼。
//
// 前面幾段都在講「解謎」那一頁（rundown 一列一列播），但玩家手上其實有五個分頁，
// 其餘四個各自吃一張表。這段把「哪一顆 ← 哪一張表」講清楚，延續整頁「表 → 手機」的主線。
// 手機上的導覽列是真的能按的：點左邊的清單或點手機都會換頁，兩邊同步。
//
// 內容照 docs/sheet/*.md 與 player/component/page/*。關卡名、提示都用首頁已經出現過的
//「旁白的字謎」，不放 demo 後面幾關的東西。

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 順序＝導覽列由左到右，index 就是 BottomNavigation 的 value
const TABS = [
  {
    label: '關卡',
    table: 'mission',
    Icon: StorageRoundedIcon,
    note: '一關一列。玩家在這裡看自己走到哪，回到打開過的關卡。',
    page: {
      model: 'MissionPage',
      missions: [
        { title: '序章', status: 'complete', Art: Libai },
        { title: '字謎', status: 'solving', active: true, Art: Mizhiyin },
        { title: '老街', status: '' },
      ],
    },
  },
  {
    label: '道具',
    table: 'prop',
    Icon: HomeRepairServiceRoundedIcon,
    note: '這一關用得到的東西：圖、轉盤、相機框。進到下一關會換一批。',
    page: {
      model: 'PropPage',
      props: [
        { title: '日記轉盤', Art: DiaryWheel },
        { title: '相機框', Art: PropCameraArt },
      ],
    },
  },
  {
    label: '解謎',
    table: 'rundown',
    Icon: QuestionAnswerRoundedIcon,
    note: '遊戲本體，玩家大部分時間都在這裡。中間那顆橘色的圓是家，去哪裡都點得回來。',
    page: { model: 'Talk', speaker: '旁白', text: '一口咬掉牛尾巴，猜一個字。' },
  },
  {
    label: '提示',
    table: 'hint',
    Icon: TipsAndUpdatesRoundedIcon,
    note: '卡住時自己解鎖。填了 timer，時間到就自動打開，按鈕上冒出紅點提醒玩家。',
    page: {
      model: 'HintPage',
      hints: [
        { speaker: '旁白', text: '先把「牛」寫出來，看看尾巴在哪裡。' },
        { locked: true, minutes: 3 },
      ],
    },
  },
  {
    label: '故事',
    table: 'story',
    Icon: AutoStoriesRoundedIcon,
    note: '過關後收到的劇情圖。玩家可以回頭翻、點開放大。',
    page: { model: 'StoryPage', stories: [{ title: '回憶 1', Art: PropImgArt }] },
  },
];
const HINT_TAB = 3;

const NavTour = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [i, setI] = useState(2); // 從「解謎」開始：玩家一進遊戲就在那一頁
  const [auto, setAuto] = useState(true);

  // 看得到才自己輪；點過任何一顆就交給使用者
  useEffect(() => {
    if (!auto || !inView || reduce) return undefined;
    const id = setTimeout(() => setI((n) => (n + 1) % TABS.length), 3600);
    return () => clearTimeout(id);
  }, [i, auto, inView, reduce]);

  const pick = (n) => {
    setI(n);
    setAuto(false);
  };
  const tab = TABS[i];
  // 紅點：提示頁以外都掛著 1——玩家一打開提示頁，時間到的那則就被解鎖，紅點跟著消失
  const page = { ...tab.page, badge: i === HINT_TAB ? 0 : 1 };

  return (
    <Box component="section" id="navbar" ref={ref} sx={{ px: 2, py: { xs: 10, md: 16 } }}>
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
            sx={{ fontWeight: 900, fontSize: { xs: '1.7rem', md: '2.6rem' }, color: 'text.primary', lineHeight: 1.3 }}
          >
            手機底下那一排，
            <br />
            每一顆是一張表。
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.9, maxWidth: 560 }}>
            玩家除了解謎，還有四個分頁可以翻。內容各自從試算表的一張表來。點點看，手機上的按鈕也按得動。
          </Typography>

          <Box component="ul" role="tablist" aria-label="導覽列的五個分頁" sx={{ listStyle: 'none', p: 0, m: 0, mt: 5, maxWidth: 560 }}>
            {TABS.map(({ label, table, Icon, note }, n) => {
              const on = n === i;
              return (
                <Box component="li" key={label} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box
                    component="button"
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => pick(n)}
                    sx={{
                      all: 'unset',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr',
                      columnGap: 1.5,
                      py: 1.75,
                      color: on ? 'text.primary' : 'text.secondary',
                      transition: 'color 200ms',
                      '&:hover': { color: 'text.primary' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: 2 },
                    }}
                  >
                    <Icon sx={{ fontSize: 24, color: on ? 'secondary.main' : 'inherit', transition: 'color 200ms' }} />
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
                      <Box component="span" sx={{ fontWeight: on ? 800 : 600, fontSize: '1.05rem' }}>
                        {label}
                      </Box>
                      <Box
                        component="code"
                        sx={{
                          fontFamily: MONO,
                          fontSize: '0.75rem',
                          px: 0.75,
                          py: 0.125,
                          borderRadius: 1,
                          bgcolor: on ? tint('secondary', 0.12) : 'action.hover',
                          color: on ? 'secondary.main' : 'text.secondary',
                        }}
                      >
                        {table} 表
                      </Box>
                    </Box>
                    {/* 說明只展開選中的那一顆：高度用 grid 0fr→1fr 撐，不量高度 */}
                    <Box
                      sx={{
                        gridColumn: 2,
                        display: 'grid',
                        gridTemplateRows: on ? '1fr' : '0fr',
                        transition: 'grid-template-rows 300ms ease',
                      }}
                    >
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography sx={{ pt: 0.75, color: 'text.secondary', lineHeight: 1.8, fontSize: '0.95rem' }}>
                          {note}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ justifySelf: 'center', position: { md: 'sticky' }, top: { md: 96 } }}>
          <PhoneFrame width={{ xs: 250, md: 280 }}>
            <PlayerScreen page={page} onNav={pick} />
          </PhoneFrame>
          {/* 手機底下一句小字，指出導覽列能按。點過就淡掉；位置一直留著，免得手機跟著跳 */}
          <Typography
            aria-hidden={!auto}
            sx={{
              mt: 2,
              textAlign: 'center',
              fontSize: '0.8rem',
              color: 'text.disabled',
              opacity: auto ? 1 : 0,
              transition: 'opacity 300ms',
            }}
          >
            ↑ 手機上的按鈕也可以點
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NavTour;
