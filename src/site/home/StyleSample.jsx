import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import Mizhiyin from './art/Mizhiyin';
import Libai from './art/Libai';
import DiaryWheel from './art/DiaryWheel';
import { INK } from './art/palette';

// 暫時的：插畫風格樣張，給 Dong 確認方向用。風格定案後整段刪掉。
const Frame = ({ children, ratio, label }) => (
  <Box>
    <Box sx={{ aspectRatio: ratio, borderRadius: 2, overflow: 'hidden', bgcolor: INK.paper }}>{children}</Box>
    <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: '0.9rem' }}>{label}</Typography>
  </Box>
);

Frame.propTypes = { children: PropTypes.node, ratio: PropTypes.string, label: PropTypes.string };

const StyleSample = () => (
  <Box component="section" sx={{ px: 2, py: 10 }}>
    <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' }, color: 'text.primary' }}>
        插畫樣張（確認風格用，定案後拿掉）
      </Typography>
      <Box
        sx={{
          mt: 4,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 2fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Frame ratio="360 / 600" label="謎之音（角色立繪）">
          <Mizhiyin />
        </Frame>
        <Frame ratio="360 / 600" label="旁白．李白（角色立繪）">
          <Libai />
        </Frame>
        <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
          <Frame ratio="1 / 1" label="前任智者的日記（道具 Wheel）">
            <DiaryWheel />
          </Frame>
        </Box>
      </Box>
    </Box>
  </Box>
);

export default StyleSample;
