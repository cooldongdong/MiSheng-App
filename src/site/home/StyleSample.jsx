import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import Mizhiyin from './art/Mizhiyin';
import DiaryWheel from './art/DiaryWheel';
import LibaiChibi from './art/libai/LibaiChibi';
import LibaiSilhouette from './art/libai/LibaiSilhouette';
import LibaiLine from './art/libai/LibaiLine';
import LibaiBlocks from './art/libai/LibaiBlocks';
import { INK } from './art/palette';

// 暫時的：插畫風格樣張，給 Dong 確認方向用。風格定案後整段刪掉，
// 沒被選上的李白版本也一起刪。
const Frame = ({ children, ratio, label, note }) => (
  <Box>
    <Box sx={{ aspectRatio: ratio, borderRadius: 2, overflow: 'hidden', bgcolor: INK.paper }}>{children}</Box>
    <Typography sx={{ mt: 1.5, color: 'text.primary', fontWeight: 700, fontSize: '0.95rem' }}>{label}</Typography>
    {note && <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', lineHeight: 1.7 }}>{note}</Typography>}
  </Box>
);
Frame.propTypes = { children: PropTypes.node, ratio: PropTypes.string, label: PropTypes.string, note: PropTypes.string };

const LIBAI = [
  ['A　Q 版', '大頭、圓眼、腮紅，從牆後探頭。', LibaiChibi],
  ['B　剪影', '舉杯邀明月。整身一塊墨，靠輪廓辨識。', LibaiSilhouette],
  ['C　線描', '一支筆畫到底，微醺左右晃。只有葫蘆上色。', LibaiLine],
  ['D　幾何積木', '圓、半圓、方塊拼成，偏海報感。', LibaiBlocks],
];

const StyleSample = () => (
  <Box component="section" sx={{ px: 2, py: 10 }}>
    <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' }, color: 'text.primary' }}>
        插畫樣張（確認風格用，定案後拿掉）
      </Typography>

      <Typography sx={{ mt: 4, color: 'text.secondary' }}>李白：選一個</Typography>
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {LIBAI.map(([label, note, Art]) => (
          <Frame key={label} ratio="360 / 600" label={label} note={note}>
            <Art />
          </Frame>
        ))}
      </Box>

      <Typography sx={{ mt: 6, color: 'text.secondary' }}>其他（上一輪的）</Typography>
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 2fr 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Frame ratio="360 / 600" label="謎之音">
          <Mizhiyin />
        </Frame>
        <Frame ratio="1 / 1" label="前任智者的日記（道具 Wheel）">
          <DiaryWheel />
        </Frame>
      </Box>
    </Box>
  </Box>
);

export default StyleSample;
