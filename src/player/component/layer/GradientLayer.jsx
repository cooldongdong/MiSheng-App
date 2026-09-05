import { Box } from '@mui/material';

// 對白文字後面那層由透明漸深的底。它讓白字在任何底圖上都讀得到。
//
// **translateZ(0) 是給 iOS 的**（Dong 2026-09-05 回報：翻頁時這一層比標題晚出現，
// **只有 iOS 有，Android 沒有**）。翻頁是靠祖先的 transform 做的，而 WebKit 在
// 那個動畫期間會重新光柵化底下的內容——一整片漸層算起來不便宜，於是它會晚一兩格
// 才畫出來。給它自己的合成層之後，漸層只光柵化一次，之後翻頁只是把同一張點陣圖
// 搬位置，不必重畫。
//
// 這一層的尺寸與內容從來不變，所以升層的代價就只有一張點陣圖的記憶體。
function GradientLayer() {
  return (
    <Box
      sx={{
        background: 'linear-gradient(transparent 12%, #37474F 66%)',
        width: '100%',
        height: '80%',
        bottom: '0%',
        position: 'absolute',
        transform: 'translateZ(0)',
      }}
    ></Box>
  );
}

export default GradientLayer;
