import PropTypes from 'prop-types';
import { Box, Link, Typography } from '@mui/material';
import { motion } from 'motion/react';
import { SheetIcon, PhoneIcon, CloudIcon, OpenIcon } from './art/FeatureIcons';

// 第五段：前面沒親手摸到、但第一次來的人會想問的四件事。
//
// 版面刻意不用卡片：上一段（道具）已經是卡片拼貼，同一種版面不在一頁出現兩次。
// 這裡是沒有外框的四欄，每欄頂上一條細線、一個疊紙小圖示、一句標題、一句話。
// 每一點都對過現況：QR 是 /create 貼 sheet 連結後真的叫得出來的那個。

const GITHUB_URL = 'https://github.com/cooldongdong/MiSheng-App';

const ITEMS = [
  {
    Icon: SheetIcon,
    title: '不用寫程式',
    desc: '會用 Google 試算表就會做。照範本填七張表：對白、角色、關卡、道具、提示、故事、設定。',
  },
  {
    Icon: PhoneIcon,
    title: '手機掃一下就開玩',
    desc: '貼上試算表連結，當場生成，再叫出 QR 給玩家掃。試算表改了，重新整理就是新版。',
  },
  {
    Icon: CloudIcon,
    title: '遊戲留在你手上',
    desc: '遊戲內容住在你自己的雲端硬碟。謎生不收、不存，也不用架任何伺服器。',
  },
  {
    Icon: OpenIcon,
    title: '開源，拿去用',
    desc: '程式碼以 AGPL-3.0 開源。想改玩法、加道具，或自己架一份，都可以。',
    href: GITHUB_URL,
  },
];

const Item = ({ Icon, title, desc, href, index }) => (
  <Box
    component={motion.div}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.4 }}
    transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    sx={{ pt: 3, borderTop: '2px solid', borderColor: 'text.primary' }}
  >
    <Box sx={{ width: 120, height: 90, ml: -1 }}>
      <Icon />
    </Box>
    <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: 'text.primary', mt: 2 }}>{title}</Typography>
    <Typography sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.85 }}>{desc}</Typography>
    {href && (
      <Link href={href} target="_blank" rel="noreferrer" sx={{ display: 'inline-block', mt: 1.5, color: 'secondary.main', fontWeight: 700 }}>
        到 GitHub 看原始碼
      </Link>
    )}
  </Box>
);
Item.propTypes = {
  Icon: PropTypes.elementType,
  title: PropTypes.string,
  desc: PropTypes.string,
  href: PropTypes.string,
  index: PropTypes.number,
};

const Features = () => (
  <Box component="section" sx={{ px: 2, py: { xs: 10, md: 16 } }}>
    <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
      <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: '1.7rem', md: '2.6rem' }, color: 'text.primary' }}>
        為什麼是謎生
      </Typography>
      <Box
        sx={{
          mt: 6,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          columnGap: 4,
          rowGap: 6,
        }}
      >
        {ITEMS.map((it, i) => (
          <Item key={it.title} {...it} index={i} />
        ))}
      </Box>
    </Box>
  </Box>
);

export default Features;
