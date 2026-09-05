import { Box, Skeleton } from '@mui/material';
import { useReduceMotion, stillSkeletonSx } from '../../hook/useImageRatio';

// 進遊戲前的載入畫面。
//
// **畫的是第一頁真正的樣子，不是一句「載入中…」**——跟 /create 的三欄骨架同一個
// 判斷（見 studio/LoadingScreen 的檔頭）：骨架回答的是「東西要來了，長這樣」，
// 而一行文字只是在說「還沒好」。玩家開場看到的第一個畫面是封面（MissionStart／
// GameStart）：一張滿版底圖，左下角副標、標題，底下一顆開始鈕。這裡就照著畫。
//
// 尺寸對齊真的那一頁：外框 padding 7%、副標 28px、標題 48px、按鈕圓角 30px
//（見 MissionStartModel、MissionSubtitleText、MissionTitleText、EndIconButton）。
const GameLoading = () => {
  const reduceMotion = useReduceMotion();

  return (
    <Box
      aria-busy="true"
      aria-label="載入中"
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...stillSkeletonSx(reduceMotion),
      }}
    >
      {/* 滿版底圖 */}
      <Skeleton
        variant="rectangular"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* 左下角那一疊：副標、標題、開始鈕 */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          padding: '7%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        <Skeleton variant="text" sx={{ fontSize: '28px', width: '32%' }} />
        <Skeleton variant="text" sx={{ fontSize: '48px', width: '72%' }} />
        <Skeleton
          variant="rounded"
          sx={{ width: '128px', height: '40px', borderRadius: '30px', mt: '10px' }}
        />
      </Box>
    </Box>
  );
};

export default GameLoading;
