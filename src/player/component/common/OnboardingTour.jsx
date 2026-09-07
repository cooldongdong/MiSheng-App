import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Stack, Typography } from '@mui/material';
import { GameContext } from '../../store/game-context';
import { keyOf, normId } from '../../../shared/rowKey';
import { TAB } from './layout';

// 第一次玩的人不知道底下那一排是什麼（COO-189）。
//
// ## 為什麼是播放器內建，不是創作者自己寫
//
// demo 目前用旁白教學，那是創作者自己做的。彈性最大，但**多數創作者不會做**
// ——一個要創作者主動做才存在的東西，等於多數遊戲不會有。而 9/20 那場約 50 人
// 多半是第一次接觸 misheng，「提示在哪」正是他們卡住時最需要的那顆鈕。
//
// ## 為什麼不在封面就跳
//
// 封面是創作者的第一印象，蓋一層黑在上面是拿他的東西換我的教學。所以等玩家
// **離開封面**（GameStart 以外的任一列）才出現——那時他已經決定要玩了，
// 也已經看得到那一排分頁。
//
// ## 為什麼步數是浮動的
//
// 沒有道具的遊戲介紹道具鈕只是噪音。步驟照這份資料**實際有什麼**來組：
// 提示與道具各自有資料才進來，所以一款遊戲會是 2～4 步。
//
// ## 記在哪
//
// 全域 key，不掛 gameId。它教的是**播放器的介面**，不是這一款遊戲的內容——
// 在 A 遊戲學會了，B 遊戲不必再看一次。代價是「清除進度」不會讓它回來，
// 所以 GameMenu 有一個「新手導覽」可以重看。
const KEY = 'misheng_onboarded';

const hasSeenTour = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    // 讀不到（無痕、擋 cookie）就當作看過——寧可少擾民，也不要每次開都蓋一層黑
    return true;
  }
};

const markSeen = () => {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* 存不了就算了，下次會再出現一次 */
  }
};

// 聚光燈的洞比目標本身大一點，不然按鈕會貼著洞緣，看起來像被切到
const PAD = 6;

// 上下滑的示範動畫。
//
// **為什麼是「演給他看」而不是「要他做一次」。** 一度想做成「真的滑了才放行」，
// 但翻頁的手勢跟鍵盤共用 canAdvance（見 GameController）——**題目沒答對的頁面
// 是滑不動的**。導覽在離開封面 1.4 秒後跳出來，那時他停在哪一列不一定；剛好落在
// 一頁還沒作答的謎題上，「請往上滑」就永遠做不到，而導覽卡在那一步出不去。
// 要救就得再加一條「幾秒後自動放行」——那是花力氣做一道一定要繞過的門。
//
// **頁面要跟著動**（Dong 2026-09-07）。只有一顆點在空中滑，講的是「你可以做這個
// 動作」；頁面跟著位移，講的才是「這個動作會發生什麼事」——而後者才是玩家要知道的。
// 所以同一組時間軸下兩份動畫：指尖走 ±44px，頁面走 ±32px（比較小，因為它是被帶動的）。
// 幅度不能再小——低於 30px 在 812 高的畫面上看不出來，等於白做。
//
// 頁面那一層的動畫用 CSS 下在 [data-tour="stage"] 上，**不碰遊戲狀態**——
// 導覽期間整個畫面是不能互動的，動完就回到原處，沒有任何東西被翻過去。
// 用 <style> 而不是直接改那個元素的 style：跨元件去寫別人的 DOM，
// 下一個人看那支元件時不會知道有人在動它；CSS 規則至少 grep 得到。
//
// 動畫本身尊重 prefers-reduced-motion——會暈的人正是最不需要一個東西在畫面上晃的人。
const DEMO_MS = 3400;

// 一趟：停 → 往上（下一頁）→ 回來 → 往下（上一頁）→ 回來 → 淡出
const track = (px) => ({
  '0%, 6%': { transform: `translateY(0px)` },
  '24%': { transform: `translateY(-${px}px)` },
  '40%': { transform: `translateY(0px)` },
  '58%': { transform: `translateY(${px}px)` },
  '74%, 100%': { transform: `translateY(0px)` },
});

// 頁面那一層。它不歸這個元件管，所以只能下 CSS
const stageCss = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes tourStage {
    0%, 6%   { transform: translateY(0); }
    24%      { transform: translateY(-32px); }
    40%      { transform: translateY(0); }
    58%      { transform: translateY(32px); }
    74%, 100%{ transform: translateY(0); }
  }
  [data-tour="stage"] { animation: tourStage ${DEMO_MS}ms ease-in-out infinite; }
}`;

const SwipeDemo = () => (
  <>
    <style>{stageCss}</style>
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: '50%',
        // 卡片自己在畫面底部，示範要畫在它上面那片變暗的內容區裡
        bottom: 'calc(100% + 28px)',
        transform: 'translateX(-50%)',
        width: 40,
        height: 128,
        pointerEvents: 'none',
        '@keyframes tourFinger': track(44),
        '@keyframes tourFingerFade': {
          '0%, 3%': { opacity: 0 },
          '8%, 88%': { opacity: 1 },
          '96%, 100%': { opacity: 0 },
        },
      }}
    >
      {/* 軌跡：一條淡淡的直線，讓那顆點看起來是在「滑」而不是在「跳」 */}
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: 4,
          bottom: 4,
          width: '2px',
          ml: '-1px',
          borderRadius: 1,
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.28), rgba(255,255,255,0))',
        }}
      />
      {/* 淡入淡出與位移拆成兩層：同一個元素只能有一個 transform，
          而兩件事的時間軸不一樣（點要先出現、才開始走） */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          animation: `tourFingerFade ${DEMO_MS}ms ease-in-out infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            ml: '-14px',
            mt: '-14px',
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'rgba(255, 255, 255, 0.92)',
            boxShadow: '0 0 0 8px rgba(255, 255, 255, 0.16)',
            animation: `tourFinger ${DEMO_MS}ms ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        />
      </Box>
    </Box>
  </>
);

const OnboardingTour = ({ activeTab, replayNonce = 0 }) => {
  const { rundownData, currentId, hintData, propData, storyData, overlayOpen, record } =
    useContext(GameContext);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const firstRun = useRef(true);

  const steps = useMemo(() => {
    const has = (rows) => Array.isArray(rows) && rows.length > 0;
    return [
      {
        sel: '[data-tour="nav"]',
        padTop: 18, // 解謎那顆圓往上凸出導覽列，洞要罩得住它
        title: '底下這一排是遊戲的分頁',
        body: '五個都隨時可以切。中間那顆橘色的是主畫面，接下來一個一個講。',
      },
      {
        sel: '[data-tour="play"]',
        padTop: 18,
        gesture: true, // 這一步要示範上下滑，見下面的手勢動畫
        title: '解謎：故事跟作答都在這裡',
        body: '看完一段往上滑翻到下一頁，往下滑退回上一頁。整場遊戲九成的時間待在這一頁——不管翻到哪去，點這顆就回得來。',
      },
      has(hintData) && {
        sel: '[data-tour="hints"]',
        title: '提示：卡住的時候點這裡',
        body: '有些提示要等一段時間才會出現。時間到了，這顆圖示的右上角會冒一個紅點。',
      },
      has(propData) && {
        sel: '[data-tour="props"]',
        title: '道具：拿到的東西放這裡',
        body: '看完點回「解謎」作答。',
      },
      {
        sel: '[data-tour="missions"]',
        title: '關卡：走到哪了、還有幾關',
        body: '想回頭看前面那一關的內容，也從這裡跳。',
      },
      has(storyData) && {
        sel: '[data-tour="stories"]',
        title: '故事：這一關累積的劇情',
        body: '走過的劇情圖與敘述留在這裡，隨時翻得回去。',
      },
    ].filter(Boolean);
  }, [hintData, propData, storyData]);

  // 玩家離開封面了沒。**用「不是 GameStart」而不是「有沒有進關」**——
  // 有些遊戲在第一關之前還有幾頁旁白，那時候導覽列就已經在畫面上了。
  const started = useMemo(() => {
    if (!Array.isArray(rundownData) || !currentId) return false;
    const row = rundownData.find((item) => keyOf(item) === currentId);
    return !!row && normId(row.model) !== 'GameStart';
  }, [rundownData, currentId]);

  // 自動開場。只跑一次，之後要看得靠 GameMenu 的「新手導覽」。
  useEffect(() => {
    if (!firstRun.current || open) return;
    if (hasSeenTour()) {
      firstRun.current = false;
      return;
    }
    // 全螢幕道具打開時導覽列是淡掉的（見 useChromeMotion），聚光燈會照到空的地方
    if (!started || overlayOpen || activeTab !== TAB.PLAY) return;
    // 等翻頁的動畫先走完，不然黑幕跟頁面轉場疊在一起
    const t = setTimeout(() => {
      firstRun.current = false;
      setStep(0);
      setOpen(true);
    }, 700);
    return () => clearTimeout(t);
  }, [started, overlayOpen, activeTab, open]);

  // 「再看一次」：GameMenu 每按一次就 +1
  useEffect(() => {
    if (!replayNonce) return;
    firstRun.current = false;
    setStep(0);
    setOpen(true);
  }, [replayNonce]);

  // 量目標的位置。**每一步都要重量**——洞會從整條導覽列縮到單一顆鈕。
  useLayoutEffect(() => {
    if (!open) return undefined;
    const current = steps[step];
    if (!current) return undefined;

    const measure = () => {
      const el = document.querySelector(current.sel);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const top = current.padTop ?? PAD;
      setRect({
        left: r.left - PAD,
        top: r.top - top,
        width: r.width + PAD * 2,
        height: r.height + top + PAD,
      });
    };

    measure();
    // 轉向、鍵盤彈出、視窗縮放都會讓導覽列換位置
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [open, step, steps]);

  // rect 量不到就整個不畫。**不能只是把洞藏起來**——卡片的位置是從 rect 算的，
  // 沒有 rect 它會被推到畫面外，變成「有一層黑幕但看不到任何字」
  if (!open || steps.length === 0 || !rect) return null;

  const last = step >= steps.length - 1;
  const current = steps[step];

  const finish = (how) => {
    markSeen();
    setOpen(false);
    record?.('tour_end', { value: `${how}:${step + 1}/${steps.length}` });
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        // 要蓋過導覽列（700）與左右上角那兩組（1200）。導覽的重點正是那一排，
        // 蓋不過去就照不亮它
        zIndex: 1500,
      }}
    >
      {/* 洞。黑幕是它往外撐出去的 box-shadow，所以洞裡是真的透明——
          底下那顆按鈕原封不動地看得見，不必再畫一顆假的 */}
      <Box
        sx={{
          position: 'fixed',
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          borderRadius: '14px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.66)',
          pointerEvents: 'none',
          transition: 'left 220ms ease, top 220ms ease, width 220ms ease, height 220ms ease',
        }}
      />

      <Box
        sx={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          // 卡片一律貼在洞的上方——這個導覽的目標全都在畫面底部那一排
          bottom: `calc(100dvh - ${rect.top - 14}px)`,
          width: 'min(360px, calc(100% - 32px))',
          bgcolor: 'background.paper',
          color: 'text.primary',
          // 遊戲畫面整體是置中的，卡片會繼承到那個 text-align。
          // 說明文字置中讀起來很怪（最後一行吊在中間），這裡要拉回左對齊
          textAlign: 'left',
          borderRadius: 2,
          p: 2,
          boxShadow: 6,
          transition: 'bottom 220ms ease',
        }}
      >
        {current.gesture && <SwipeDemo />}

        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          {current.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
          {current.body}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 2 }}>
          <Button size="small" color="inherit" onClick={() => finish('skip')}>
            跳過
          </Button>
          <Stack direction="row" spacing={0.75} sx={{ flex: 1, justifyContent: 'center' }}>
            {steps.map((s, i) => (
              <Box
                key={s.sel}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: i === step ? 'secondary.main' : 'divider',
                }}
              />
            ))}
          </Stack>
          {/* 第一步時是 disabled 而不是不畫——**不畫會讓「下一步」在按下去的瞬間
              往左跳**，手指還停在原位就按到別的東西 */}
          <Button
            size="small"
            color="inherit"
            disabled={step === 0}
            onClick={() => setStep((n) => Math.max(0, n - 1))}
          >
            上一步
          </Button>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={() => (last ? finish('done') : setStep((n) => n + 1))}
          >
            {last ? '開始玩' : '下一步'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

OnboardingTour.propTypes = {
  activeTab: PropTypes.number.isRequired,
  replayNonce: PropTypes.number,
};

export default OnboardingTour;
