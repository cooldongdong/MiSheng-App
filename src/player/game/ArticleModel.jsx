import { useState, useContext } from 'react';
import { Box, Fab, Paper } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import PropTypes from 'prop-types';
import NextButton from '../component/common/NextButton';
import { GameContext } from '../store/game-context';
import { ArticleBody, ArticleFullscreen } from './ArticleReader';
import { articleTextOf } from './articleText';

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


const Article = ({ currentRow, onNext, canProceed, hideContent = false }) => {
  const { getImg, customPairs } = useContext(GameContext);
  const [zoomed, setZoomed] = useState(false);

  const text = articleTextOf(currentRow, customPairs);

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
              <ArticleBody
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
        <ArticleFullscreen
          row={currentRow}
          text={text}
          onClose={() => setZoomed(false)}
        />
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
