import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import Mizhiyin from './art/Mizhiyin';
import DiaryWheel from './art/DiaryWheel';
import LibaiSilhouette from './art/libai/LibaiSilhouette';
import LibaiBlocks from './art/libai/LibaiBlocks';
import LibaiMoonBlocks from './art/libai/LibaiMoonBlocks';
import LibaiBlocksToast from './art/libai/LibaiBlocksToast';
import LibaiPapercut from './art/libai/LibaiPapercut';
import LibaiSymbol from './art/libai/LibaiSymbol';
import LibaiSwissPoster from './art/libai/LibaiSwissPoster';
import LibaiSwissGlyph from './art/libai/LibaiSwissGlyph';
import LibaiSwissGrid from './art/libai/LibaiSwissGrid';
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

// 第二輪：Dong 選了 B、D，往這兩個方向延伸。A（Q 版）、C（線描）出局，檔案留到定案再刪
const LIBAI = [
  ['B　剪影', '上一輪。舉杯邀明月，側面剪影。', LibaiSilhouette],
  ['D　幾何積木', '上一輪。圓、半圓、方塊拼成的正面。', LibaiBlocks],
  ['E　剪影 × 積木', 'B 的構圖、D 的零件。正面剪影，水平帽翅，舉杯敬月。', LibaiMoonBlocks],
  ['F　積木舉杯', 'D 的色塊臉，加上 B 的動作：把葫蘆舉向月亮。', LibaiBlocksToast],
  ['G　剪紙鏤空', 'E 反過來：夜色的墨底，人是剪掉的紙。', LibaiPapercut],
  ['H　極簡符號', '月亮就是臉，只留帽子、眼睛、鬍子。像一枚 logo。', LibaiSymbol],
];

// 第三輪：瑞士平面風
const SWISS = [
  ['I 瑞士海報', '六欄網格，人只用矩形與半圓；直排粗黑「旁白」本身就是構圖。', LibaiSwissPoster],
  ['J 字即圖', '一個巨大的「白」字就是臉，戴上鏽橘幞頭、掛上鬍子。', LibaiSwissGlyph],
  ['K 模組網格', '3×4 方格，每格一個幾何形，進場時一格一格排上去。', LibaiSwissGrid],
];

const Grid = ({ items }) => (
  <Box
    sx={{
      mt: 2,
      display: 'grid',
      gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' },
      gap: 3,
      alignItems: 'start',
    }}
  >
    {items.map(([label, note, Art]) => (
      <Frame key={label} ratio="360 / 720" label={label} note={note}>
        <Art />
      </Frame>
    ))}
  </Box>
);
Grid.propTypes = { items: PropTypes.array.isRequired };

const StyleSample = () => (
  <Box component="section" sx={{ px: 2, py: 10 }}>
    <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' }, color: 'text.primary' }}>
        插畫樣張（確認風格用，定案後拿掉）
      </Typography>

      <Typography sx={{ mt: 4, color: 'text.secondary' }}>李白：瑞士平面風（第三輪）</Typography>
      <Grid items={SWISS} />

      <Typography sx={{ mt: 6, color: 'text.secondary' }}>李白：剪影與積木（第二輪）</Typography>
      <Grid items={LIBAI} />

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
