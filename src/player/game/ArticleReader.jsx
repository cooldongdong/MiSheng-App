import { useState, useRef, useContext, useLayoutEffect } from 'react';
import { Fab, Paper, Typography, Box } from '@mui/material';
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded';
import PropTypes from 'prop-types';
import FullscreenStage from '../component/common/FullscreenStage';
import { NAV_HEIGHT, OVERLAY_MAX_WIDTH } from '../component/common/layout';
import { chromeMotionSx, useChromeHidden } from '../hook/useChromeMotion';
import { GameContext } from '../store/game-context';
import RichText from './markdownLite';

// Article 的內容與滿版閱讀。
//
// **從 ArticleModel 抽出來，因為故事頁也要讀同一篇文章**（rundown.story，2026-09-24）。
// 流程裡的那一頁與故事頁的卡片長得不一樣（一個是整頁的卡、一個是清單裡的一格），
// 但**放大之後必須是同一個東西**：同一個面板、同一套捲動與下滑關閉。
// 複製一份的話，下一次修手勢只會修到其中一邊——而手勢的 bug 只有在手機上才看得到。

// 手勢門檻。**刻意與 usePhotoGestures 用同一組數字**——圖片與文章的「下滑關閉」
// 對使用者是同一個動作，手感不該因為裡面裝的是字還是圖而不同。
const DISMISS_PX = 110;
const DISMISS_VELOCITY = 0.6;
const TAP_SLOP = 8;
const TAP_MS = 400;

// 卡片與滿版共用同一份內容。**抽成一個函式而不是兩段 JSX**：兩份會分岔，而分岔的
// 症狀是「放大之後少了一段」這種沒有人會回報、只會覺得怪的東西。
export const ArticleBody = ({ row, text, getImg, scrollRef }) => (
  <>
    {row.title && (
      <Typography
        variant="h6"
        align="left"
        sx={{
          // **h6 的預設字重是 500，不是粗體。** 於是文章標題比它底下的 `## 小標`
          // （700）還細，階層是反的（Dong 2026-09-12）。
          // 現在是 標題 20/700 → 小標 17/700 → 內文 14/400、行內粗體 14/700：
          // 最上面兩階同字重、靠字級分，跟內文則字級與字重都分得開。
          fontWeight: 700,
          mb: 1.5,
          flexShrink: 0,
          color: 'text.primary',
        }}
      >
        {row.title}
      </Typography>
    )}

    <Box
      ref={scrollRef}
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        // **不要改成 pan-y。** 理由與 TalkText 完全相同：宣告 pan-y 等於把垂直手勢
        // 整段交給瀏覽器，而它在手指按下那一刻就取得所有權、不會中途交還——於是
        // 「讀到底才翻頁」永遠不會發生。維持 none，捲動由 useSwipeFlow 自己做。
        touchAction: 'none',
        pr: 1,
        mr: -1,
      }}
    >
      {/* **圖由內文自己放，不再讀 backgroundImg。**
          原本是把 backgroundImg 畫在文章最上面，但那等於「一篇文章只能有一張圖，
          而且只能在開頭」。導覽解說常常是「講到第一代廟宇 → 放那張照片 → 再講
          第二代」，位置本身就是內容的一部分（Dong 2026-09-12）。
          現在寫 `![說明](檔名)` 自成一行就是一張圖，而且**點得開**——匾額、碑文、
          老照片正是需要湊近看的，那是 backgroundImg 那條路做不到的。 */}
      <RichText text={text} resolveImg={getImg} />
    </Box>
  </>
);

ArticleBody.propTypes = {
  row: PropTypes.object.isRequired,
  text: PropTypes.string.isRequired,
  getImg: PropTypes.func.isRequired,
  scrollRef: PropTypes.object,
};

// 滿版閱讀。掛上就是打開，onClose 關掉——開不開由呼叫端的 state 決定。
export const ArticleFullscreen = ({ row, text, onClose }) => {
  const {
    getImg,
    openOverlay,
    closeOverlay,
    setOverlayChromeVisible: setChromeVisible,
  } = useContext(GameContext);
  const { chromeHidden } = useChromeHidden();

  // 滿版時把導覽列與品牌標收掉，跟看圖放大同一套。
  // **useLayoutEffect 不是 useEffect**：後者會多隔一次繪製，導覽列在滿版底上被看見
  // 一格（ZoomableImage 那邊踩過，Dong 2026-09-05 回報）。
  useLayoutEffect(() => {
    // 每次重新放大都回到「看得見」：唯一的出口不可以藏在一個要先發現的手勢後面。
    setChromeVisible?.(true);
    openOverlay?.();
    return () => closeOverlay?.();
  }, [openOverlay, closeOverlay, setChromeVisible]);

  // 滿版時的手勢：**捲動、點一下收介面、下滑關閉，三件事都得自己做。**
  //
  // 為什麼不能交給別人：
  //   · 瀏覽器 —— 捲動區宣告 touch-action:none。改成 pan-y 的話瀏覽器會在手指按下
  //     那一刻取得整段手勢的所有權、不會中途交還（TalkText 的檔頭記著這件事），
  //     「捲到頂再往下拉就關閉」就永遠不會發生。
  //   · useSwipeFlow —— 舞台掛著 data-no-swipe，它在 onPointerDown 就整個讓開
  //     （useSwipeFlow.js:359）。
  //
  // 兩件事湊在一起的後果是**手機上滿版的文章完全捲不動**（桌機有滾輪所以看不出來，
  // 我因此驗不到；Dong 2026-09-11 在手機上回報「不喜歡放大版的介面」）。
  //
  // 門檻沿用 usePhotoGestures 的同一組數字，這樣「下滑關閉」在圖片與文章上手感一致。
  const scrollRef = useRef(null);
  const drag = useRef(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

  const gestureHandlers = {
    onPointerDown: (e) => {
      drag.current = {
        x: e.clientX,
        y: e.clientY,
        lastY: e.clientY,
        t: Date.now(),
        moved: false,
        pulled: 0,
      };
      setDragging(true);
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d) return;
      const step = d.lastY - e.clientY; // 正 ＝ 手指往上 ＝ 內容往後捲
      d.lastY = e.clientY;
      if (Math.abs(e.clientX - d.x) > TAP_SLOP || Math.abs(e.clientY - d.y) > TAP_SLOP) {
        d.moved = true;
      }
      const el = scrollRef.current;
      if (!el) return;
      const atTop = el.scrollTop <= 0;
      // 已經在頂端又繼續往下拉 ＝ 關閉手勢；其餘一律是捲動。
      // **先試捲動再判關閉**，不然長文讀到一半往下捲會被誤判成想關掉。
      if (atTop && step < 0 && d.pulled >= 0) {
        d.pulled = Math.max(0, d.pulled - step);
        setDy(d.pulled);
      } else {
        if (d.pulled > 0) {
          d.pulled = Math.max(0, d.pulled - Math.max(0, step));
          setDy(d.pulled);
        }
        el.scrollTop += step;
      }
    },
    onPointerUp: (e) => {
      const d = drag.current;
      drag.current = null;
      setDragging(false);
      if (!d) return;
      const dt = Date.now() - d.t;
      const velocity = d.pulled / Math.max(dt, 1);
      if (d.pulled > DISMISS_PX || velocity > DISMISS_VELOCITY) {
        setDy(0);
        onClose();
        return;
      }
      setDy(0);
      // 幾乎沒動又夠快 ＝ 點一下，收起／叫回介面。
      // 這個判斷放在最後：捲動與下拉都已經先被排除掉了。
      if (!d.moved && dt < TAP_MS) setChromeVisible?.((v) => !v);
      void e;
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragging(false);
      setDy(0);
    },
  };

  return (
      <FullscreenStage onBackdropClick={onClose}>
        {/* **一塊置中、有上限的面板。**
            前三版各自走偏一次，記下來免得再繞：
              ① 鎖 600px ＋ 7% 內距 → 寬視窗下反而比卡片小
              ② 整個貼邊 → 四周一點餘白都沒有
              ③ 92% 不設上限 → 視窗一寬就攤成一片，一行快五十個中文字
            ③ 正是 Dong 2026-09-11 附的那張 1200px 截圖。**上限不是縮水，是
            「放大不等於攤開」**——這跟 ZoomableImage 不讓圖片無限放大是同一件事，
            所以兩邊現在共用 OVERLAY_MAX_WIDTH。

            手機（390 寬）上 92% ＝ 359px，扣掉 24px 內距後約 311px、一行約 21 個
            中文字，仍然大於卡片的閱讀寬度；桌機停在 600px，一行約 38 字——都落在
            中文舒適行長（20–35，稍寬可接受）裡，而且**不再隨視窗變動**。

            **圓角加回來了。** 上一輪說「不用圓角」是在它幾乎貼邊的時候，那時直角
            才對；現在四周都有餘白，一塊直角的板子跟遊戲裡其他卡片（一律 20px）
            對不起來。不喜歡就把這一行拿掉，不影響上面任何一個數字。 */}
        {/* **是 Paper 不是 Box，而且 elevation 要跟卡片一樣。**
            MUI 的 Paper 在深色模式會疊一層 elevation overlay
            （`background-image: var(--Paper-overlay)`，白色半透明，elevation=10
            大約 12%）。所以同樣寫 `background.paper`，Paper 畫出來比裸的 Box 亮
            一截——卡片是 Paper、滿版是 Box 的時候，「展開跟縮小的底色不一樣」
            （Dong 2026-09-12）。用同一種元件 ＋ 同一個 elevation，才是同一個顏色。 */}
        <Paper
          elevation={10}
          {...gestureHandlers}
          sx={{
            position: 'absolute',
            width: '92%',
            maxWidth: `${OVERLAY_MAX_WIDTH}px`,
            // 同卡片：關掉染色、留住投影（理由見卡片那邊）
            backgroundImage: 'none',
            left: '50%',
            // 下拉時跟著位移並微微縮小——那是「它要離開了」的回饋，
            // 沒有的話看起來像卡住（同 ZoomableImage 的放大圖）。
            transform: `translate(-50%, ${dy}px) scale(${1 - Math.min(dy / 1600, 0.1)})`,
            transition: dragging ? 'none' : 'transform 220ms ease',
            top: 56,
            // 舞台刻意往下多蓋一條導覽列，底部的距離要把那 56px 加回來。
            // 再多留 92px 給浮在畫面正下方的縮小鈕（它 56 高、坐在可視底部上方
            // 20px，所以頂端在 76px 處），文字才不會捲到按鈕底下。
            bottom: NAV_HEIGHT + 92,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            p: 3,
            boxSizing: 'border-box',
            // bgcolor 不用寫——Paper 本來就是 background.paper，
            // 而且自己帶 elevation overlay（見上方註解）。寫死反而會把那一層蓋掉。
            // **邊是必要的，不是裝飾。** 深色模式下面板（#17191c）對舞台底
            // （#08090a）只有 1.13:1——「浮起來」在深色靠的是亮度差，而低亮度區
            // 的亮度差人眼幾乎分不出來，陰影在深色上也近乎不可見（2026-09-09 在
            // 導覽卡片上踩過同一個坑）。所以改用不依賴亮度關係的東西：一條實體的邊。
            border: 1,
            borderColor: 'divider',
            borderRadius: '20px',
            textAlign: 'left',
          }}
        >
          <ArticleBody
            row={row}
            text={text}
            getImg={getImg}
            scrollRef={scrollRef}
          />
        </Paper>

        {/* 縮小鈕。位置與動作照抄 ZoomableImage 的那一顆：畫面正下方、會跟著
            「點一下」收起來。動作樣式下在 Fab 自己身上——外框只要有 transform
            就會變成定位基準。 */}
        <Fab
          onClick={() => onClose()}
          sx={{
            ...chromeMotionSx(chromeHidden, {
              from: 'bottom',
              base: 'translateX(-50%)',
            }),
            position: 'absolute',
            // 舞台往下多蓋了一條導覽列的高度，這裡要加回來，否則按鈕會有一半
            // 掉到畫面外（Dong 2026-09-05 在 Android 回報過同一件事）。
            bottom: NAV_HEIGHT + 20,
            left: '50%',
            zIndex: 2,
            backgroundColor: '#fff',
            color: '#37474F',
          }}
        >
          <CloseFullscreenRoundedIcon />
        </Fab>
      </FullscreenStage>
  );
};

ArticleFullscreen.propTypes = {
  row: PropTypes.object.isRequired,
  text: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
