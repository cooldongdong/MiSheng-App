import { useId } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import { motion, useTransform } from 'motion/react';
import { cloudEdge } from './art/paperUtils';

// 頁面本身的「疊紙」：幾層雲形的紙，從某一段的底部（或頂部）長出來。
//
// **跟插畫不一樣，這裡要吃 theme。** 插畫是印好的東西，深淺模式都同一個樣子；
// 但這幾層雲是頁面的一部分——深色模式下鋪一排淺色紙雲，等於在頁面中間開一塊白，
// 那叫「整頁換主題」，不是裝飾。所以雲的顏色用 text.primary 的透明疊層，
// 最前面一層用這一頁的底色，看起來就是「下一張紙從這裡開始」。
//
// progress：外面傳進來的捲動進度（0→1）。每層按自己的深度往上移，越前面移越多，捲動時就有景深。

const W = 1440;
const H = 220;

// [雲邊的 y、雲朵半徑範圍、種子、顏色、捲動時往上移幾 px]
const LAYERS = [
  // 三層的雲邊靠得很近：露出來的只是一圈圈薄邊，像紙的厚度。
  // 第一版間距拉開，中間露出整片灰，在深色模式下讀成「淺色雲後面一排黑山」
  [138, [60, 140], 3, 'rgba(var(--mui-palette-text-primaryChannel) / 0.05)', 24],
  [158, [44, 100], 8, 'rgba(var(--mui-palette-text-primaryChannel) / 0.08)', 50],
  [180, [30, 72], 13, 'var(--mui-palette-background-default)', 90],
];

const Layer = ({ y, r, seed, fill, lift, progress, filter }) => {
  const dy = useTransform(progress, [0, 1], [0, -lift]);
  return (
    <motion.path
      d={cloudEdge(y, { minR: r[0], maxR: r[1], seed, width: W, height: H + 120, flat: 1.5 })}
      style={{ fill, y: dy }}
      filter={filter}
    />
  );
};
Layer.propTypes = {
  y: PropTypes.number,
  r: PropTypes.arrayOf(PropTypes.number),
  seed: PropTypes.number,
  fill: PropTypes.string,
  lift: PropTypes.number,
  progress: PropTypes.object,
  filter: PropTypes.string,
};

const PaperClouds = ({ progress, flip = false, sx }) => {
  // 同一頁會用兩次（hero 底、結尾頂），濾鏡 id 要各自唯一；冒號放進 url(#...) 會失效
  const fid = `pc${useId().replace(/:/g, '')}`;
  return (
  <Box
    aria-hidden
    sx={{
      position: 'absolute',
      left: 0,
      right: 0,
      height: { xs: 90, md: 170 },
      pointerEvents: 'none',
      ...(flip ? { top: 0, transform: 'scaleY(-1)' } : { bottom: 0 }),
      ...sx,
    }}
  >
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" width="100%" height="100%">
      <defs>
        <filter id={fid} x="-5%" y="-30%" width="110%" height="160%">
          <feDropShadow dx="0" dy="-3" stdDeviation="5" floodColor="#263238" floodOpacity="0.12" />
        </filter>
      </defs>
      {LAYERS.map(([y, r, seed, fill, lift]) => (
        <Layer key={y} y={y} r={r} seed={seed} fill={fill} lift={lift} progress={progress} filter={`url(#${fid})`} />
      ))}
    </svg>
  </Box>
  );
};
PaperClouds.propTypes = { progress: PropTypes.object.isRequired, flip: PropTypes.bool, sx: PropTypes.object };

export default PaperClouds;
