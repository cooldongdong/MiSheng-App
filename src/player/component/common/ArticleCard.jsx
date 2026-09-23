import PropTypes from 'prop-types';
import { useContext } from 'react';
import { Box, Fab, Paper } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import { GameContext } from '../../store/game-context';
import { ArticleBody, ArticleFullscreen } from '../../game/ArticleReader';

// 故事頁清單裡的一篇 Article。
//
// **外框照 ZoomableImage 的清單卡片**（圓角 10px、elevation 10、右下角小顆放大鈕），
// 因為它跟 story 圖卡排在同一個清單裡——同一頁上兩種卡片長得不一樣，玩家會以為
// 它們是兩種功能。**放大之後則跟流程裡的 Article 一模一樣**（共用 ArticleFullscreen）。
//
// 控制方式也照 ZoomableImage（isFullScreen／showZoomButton／onToggle），
// 這樣故事頁用同一個 fullScreenIndex 就能管住圖和文章：一次只放大一個，
// 其他卡片的放大鈕在放大時藏起來。
//
// **卡片裡只露前面一段，底部淡出。** 整篇攤開的話一篇 800 字的沿革就佔掉好幾屏，
// 底下的東西全被推走；淡出是在說「還有，點開來讀」。
const PREVIEW_HEIGHT = 220;

const ArticleCard = ({ row, text, isFullScreen, showZoomButton, onToggle }) => {
  const { getImg } = useContext(GameContext);

  return (
    <>
      <Paper
        elevation={10}
        sx={{
          borderRadius: '10px',
          position: 'relative',
          // 同 ArticleModel 的卡片：關掉深色模式的染色、補一條邊——
          // 純色面板跟底的對比只有 1.1:1，沒有邊就融在一起。
          backgroundImage: 'none',
          border: 1,
          borderColor: 'divider',
          textAlign: 'left',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            maxHeight: PREVIEW_HEIGHT,
            overflow: 'hidden',
            p: 2.5,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ArticleBody row={row} text={text} getImg={getImg} preview />
        </Box>

        {/* 淡出。**顏色取 background.paper**，跟卡片同一個底，才是「字漸漸消失」
            而不是「一塊灰色蓋上來」。 */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 72,
            borderRadius: '0 0 10px 10px',
            background: (t) =>
              `linear-gradient(to bottom, transparent, ${t.palette.background.paper})`,
            pointerEvents: 'none',
          }}
        />

        {showZoomButton && (
          <Fab
            size="small"
            onClick={onToggle}
            sx={{
              position: 'absolute',
              right: 10,
              bottom: 10,
              zIndex: 1101,
              // translateZ(0) 的理由見 ZoomableImage：iOS 上沒有自己的合成層時，
              // z-index 在底下的圖層安定之前不算數。
              transform: 'translateZ(0)',
              backgroundColor: '#fff',
              color: '#37474F',
            }}
          >
            <OpenInFullRoundedIcon />
          </Fab>
        )}
      </Paper>

      {isFullScreen && (
        <ArticleFullscreen row={row} text={text} onClose={onToggle} />
      )}
    </>
  );
};

ArticleCard.propTypes = {
  row: PropTypes.object.isRequired,
  text: PropTypes.string.isRequired,
  isFullScreen: PropTypes.bool.isRequired,
  showZoomButton: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ArticleCard;
