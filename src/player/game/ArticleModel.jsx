import { useState, useRef, useContext, useLayoutEffect } from 'react';
import { Box, Fab, Paper, Typography } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseFullscreenRoundedIcon from '@mui/icons-material/CloseFullscreenRounded';
import PropTypes from 'prop-types';
import NextButton from '../component/common/NextButton';
import FullscreenStage from '../component/common/FullscreenStage';
import { NAV_HEIGHT, OVERLAY_MAX_WIDTH } from '../component/common/layout';
import { chromeMotionSx, useChromeHidden } from '../hook/useChromeMotion';
import { GameContext } from '../store/game-context';
import RichText from './markdownLite';

// Article：一整頁可以捲的長文。
//
// **為什麼不是「把 Talk 的框變大」。** Talk 的每一個設定都是為了「有人在對你說話」：
// 逐字打、蓋在美術圖上、底部 120px 的框。那三件事在 30 字的台詞上是對的，在 800 字的
// 地方誌上每一件都變成阻礙——打字機 50ms 一字，800 字要等 40 秒；120px 的框大約一屏
// 88 字，要捲九屏才讀得完（Dong 2026-09-11 拿樹林崁頂福德宮的沿革撞出來的）。
//
// **為什麼不放進 story 表。** story 是按 missionId 過濾的清單，進關就全部看得到
// （StoryPage.jsx，沒有任何解鎖）。而這種補充多半是解完謎才該給的——放 story
// 等於提前發答案。rundown 是唯一能精確表達「在流程的這個點」的地方。
//
// **整組介面照 ImgModel／ZoomableImage 抄，不是照我自己的想法設計**（Dong 2026-09-11
// 連續兩輪回報）：外框尺寸、卡片高度、放大鈕的位置與樣式、滿版之後縮小鈕落在畫面
// 正下方、點一下收起介面——每一項都跟看圖放大一模一樣。理由是**使用者不該為了讀
// 一篇文章再學一套介面**：這一頁與謎面頁的差別應該只剩「裡面裝的是字還是圖」。
//
// **圖刻意不當背景。** 這一種 model 存在的理由就是「長文要讀得下去」，滿版底圖會把
// 對比拱手讓給美術。圖是寫在內文裡的（`![說明](檔名)` 自成一行），跟著內容一起捲。
// **文章裡的圖不能單獨放大**，理由見 markdownLite 的 ArticleImage——一頁上兩顆長得
// 一樣的放大鈕，使用者得先分辨哪顆是哪顆。要看清楚就把整篇文章放大。
//
// **這一版取代了原本讀 `backgroundImg` 的做法**：那等於「一篇文章只能有一張圖，
// 而且只能在開頭」，而導覽解說常常是「講到第一代廟宇 → 放那張照片 → 再講第二代」,
// 位置本身就是內容的一部分（Dong 2026-09-12）。`Article` 從此不讀 `backgroundImg`。

// 卡片與滿版共用同一份內容。**抽成一個函式而不是兩段 JSX**：兩份會分岔，而分岔的
// 症狀是「放大之後少了一段」這種沒有人會回報、只會覺得怪的東西。
// 手勢門檻。**刻意與 usePhotoGestures 用同一組數字**——圖片與文章的「下滑關閉」
// 對使用者是同一個動作，手感不該因為裡面裝的是字還是圖而不同。
const DISMISS_PX = 110;
const DISMISS_VELOCITY = 0.6;
const TAP_SLOP = 8;
const TAP_MS = 400;

const Body = ({ row, text, getImg, scrollRef }) => (
  <>
    {row.title && (
      <Typography
        variant="h6"
        align="left"
        sx={{ mb: 1.5, flexShrink: 0, color: 'text.primary' }}
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

Body.propTypes = {
  row: PropTypes.object.isRequired,
  text: PropTypes.string.isRequired,
  getImg: PropTypes.func.isRequired,
  scrollRef: PropTypes.object,
};

const Article = ({ currentRow, onNext, canProceed, hideContent = false }) => {
  const {
    getImg,
    customPairs,
    openOverlay,
    closeOverlay,
    setOverlayChromeVisible: setChromeVisible,
  } = useContext(GameContext);
  const [zoomed, setZoomed] = useState(false);
  const { chromeHidden } = useChromeHidden();

  // 滿版時把導覽列與品牌標收掉，跟看圖放大同一套。
  // **useLayoutEffect 不是 useEffect**：後者會多隔一次繪製，導覽列在滿版底上被看見
  // 一格（ZoomableImage 那邊踩過，Dong 2026-09-05 回報）。
  useLayoutEffect(() => {
    if (!zoomed) return undefined;
    // 每次重新放大都回到「看得見」：唯一的出口不可以藏在一個要先發現的手勢後面。
    setChromeVisible?.(true);
    openOverlay?.();
    return () => closeOverlay?.();
  }, [zoomed, openOverlay, closeOverlay, setChromeVisible]);

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
        setZoomed(false);
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

  // {{key}} 替換。Talk 與 Quiz 各自有一份，其餘頁面吃不到（COO-32）——
  // 新的 model 至少不要再多欠一筆。
  // **在 markdown 解析之前做**：反過來的話，變數值裡如果有 ** 會被當成語法。
  const text = (currentRow?.text || '').replace(
    /\{\{(.*?)\}\}/g,
    (match, key) => customPairs[key] ?? match
  );

  if (!currentRow) return null;

  return (
    <>
      {/* 外框與 ImgModel 一模一樣 */}
      <Box
        sx={{
          height: 'calc(60dvh + 100px)',
          width: '76%',
          m: 'auto',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={10}
          sx={{
            // ImgModel 的卡片是 86% 高、NEXT 佔掉剩下的——照抄
            height: '86%',
            width: '100%',
            borderRadius: '20px',
            // **關掉 MUI 在深色模式疊的那層染色，但保留投影。**
            // Paper 的 elevation 在深色做了兩件事：box-shadow（投影）與
            // `background-image: var(--Paper-overlay)`（一層白色半透明，elevation=10
            // 約 12%）。Dong 2026-09-12 明確偏好沒有染色的那個較深的底，
            // 而投影在淺色模式還有用——所以只關後者，不動 elevation。
            backgroundImage: 'none',
            // **跟滿版面板同一條邊，理由也同一個。** 量出來的關係比滿版還糟：
            // 深色下卡片（#17191c）對遊戲頁底（#0e0f11）只有 1.09:1，淺色是 1.11:1
            // ——而 elevation 的陰影在深色上近乎不可見，等於沒有任何東西在畫邊界。
            //
            // **為什麼只有 Article 需要。** MissionStart／GameStart／ImgModel 也走
            // 同樣的卡片，但它們裡面裝的是滿版的美術圖，圖自己就是邊界；Article 裝的
            // 是一塊純色面板，所以只有它會跟底融在一起。
            border: 1,
            borderColor: 'divider',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            // **內距下在裡面那一層，不是 Paper 自己身上。**
            // 絕對定位的子元素是以 Paper 的 padding box 為基準，Paper 一有內距，
            // 放大鈕的 `bottom: 10` 就會往上跑 7%，不再咬住卡片下緣
            //（Dong 2026-09-11：「放大鈕的位置不對」）。ImgModel 的 Paper 沒有內距，
            // 所以它的鈕剛好落在邊上——這裡要一樣。
            //
            // **也不能有 overflow: hidden。** 放大鈕靠 translateY(50%) 讓自己有一半
            // 掛在卡片外緣，一裁就只剩上半顆，看起來像「被包在文章裡面」
            //（Dong 2026-09-11 第二次回報）。ZoomableImage 的 Paper 同樣沒有裁切，
            // 內容不會碰到圓角是因為它本來就有內距。
            // **靠左。** /demo 的 App.css 有一行 Vite 樣板留下來的
            // `#root { text-align: center }`，所有文字預設置中；TalkText 與
            // QuestionText 都寫了 align="left" 明確退出，這裡照做。
            textAlign: 'left',
          }}
        >
          {!hideContent && (
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                p: '7%',
                boxSizing: 'border-box',
              }}
            >
              <Body
              row={currentRow}
              text={text}
              getImg={getImg}
            />
            </Box>
          )}

          {/* 放大鈕。位置、尺寸、配色整組照 ZoomableImage 的 zoomInFab='center'。
              **放大之後要藏起來**——看圖那邊是 `showZoomButton={fullScreenIndex === null}`，
              這裡同理。不藏的話它的 z-index(1101) 比舞台(1000) 大，會浮在滿版之上
              （Dong 2026-09-11 回報）。 */}
          {!hideContent && !zoomed && (
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                bottom: 10,
                display: 'flex',
                alignItems: 'center',
                zIndex: 1101,
                // translateZ(0) 的理由見 ZoomableImage：iOS 上沒有自己的合成層時，
                // z-index 在底下的圖層安定之前不算數。
                transform: 'translateZ(0)',
                pointerEvents: 'none',
              }}
            >
              <Fab
                size="medium"
                onClick={() => setZoomed(true)}
                sx={{
                  backgroundColor: '#fff',
                  color: '#37474F',
                  m: 'auto',
                  top: 10,
                  transform: 'translateY(50%)',
                  pointerEvents: 'auto',
                }}
              >
                <OpenInFullRoundedIcon />
              </Fab>
            </Box>
          )}
        </Paper>

        {/* hideContent 見 TalkModel 檔頭。往上拉露出的是還沒發生的那一頁。 */}
        {!hideContent && canProceed && (
          <NextButton onClick={onNext}>NEXT</NextButton>
        )}
      </Box>

      {zoomed && (
        <FullscreenStage onBackdropClick={() => setZoomed(false)}>
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
            <Body
              row={currentRow}
              text={text}
              getImg={getImg}
              scrollRef={scrollRef}
            />
          </Paper>

          {/* 縮小鈕。位置與動作照抄 ZoomableImage 的那一顆：畫面正下方、會跟著
              「點一下」收起來。動作樣式下在 Fab 自己身上——外框只要有 transform
              就會變成定位基準。 */}
          <Fab
            onClick={() => setZoomed(false)}
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
      )}
    </>
  );
};

Article.propTypes = {
  hideContent: PropTypes.bool,
  currentRow: PropTypes.object.isRequired,
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
};

export default Article;
