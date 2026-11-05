import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import CloudDoneRoundedIcon from '@mui/icons-material/CloudDoneRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import { motion } from 'motion/react';
import { tint } from './tint';

// 第四段：前面沒親手摸到、但第一次來的人會想問的四件事。

// 卡片插圖一：格子一格一格填滿——「會用試算表就會做」
const FillingGrid = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '4px',
      width: 150,
      '@keyframes fillCell': {
        '0%, 15%': { bgcolor: 'transparent' },
        '25%, 80%': { bgcolor: 'var(--fill)' },
        '100%': { bgcolor: 'transparent' },
      },
    }}
  >
    {Array.from({ length: 18 }, (_, i) => (
      <Box
        key={i}
        sx={{
          height: 14,
          borderRadius: '3px',
          border: '1px solid',
          borderColor: 'divider',
          '--fill': (t) => `rgba(${t.vars.palette.secondary.mainChannel} / ${0.25 + (i % 4) * 0.15})`,
          animation: 'fillCell 4.5s infinite',
          animationDelay: `${i * 0.12}s`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none', bgcolor: 'var(--fill)' },
        }}
      />
    ))}
  </Box>
);

// 插圖二：QR 加上掃描線
const QR_BITS = '1110111010110100101111001011101001101011100111011110100101101110010110101100111010111010';
const ScanQr = () => (
  <Box
    sx={{
      position: 'relative',
      p: 1,
      borderRadius: 1.5,
      bgcolor: '#fff',
      overflow: 'hidden',
      '@keyframes scan': { '0%': { top: '-10%' }, '100%': { top: '105%' } },
    }}
  >
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(11, 7px)', gap: '1px' }}>
      {[...QR_BITS.slice(0, 99).padEnd(99, '0')].map((b, i) => (
        <Box key={i} sx={{ width: 7, height: 7, bgcolor: b === '1' ? '#263238' : 'transparent' }} />
      ))}
    </Box>
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 3,
        bgcolor: 'secondary.main',
        boxShadow: (t) => `0 0 12px 3px ${t.vars.palette.secondary.main}`,
        animation: 'scan 2.2s ease-in-out infinite alternate',
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
      }}
    />
  </Box>
);

const IconArt = ({ children }) => (
  <Box
    component={motion.div}
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    sx={{ color: 'secondary.main', '& svg': { fontSize: 64 } }}
  >
    {children}
  </Box>
);
IconArt.propTypes = { children: PropTypes.node };

const CARDS = [
  {
    title: '不用寫程式',
    desc: '會用 Google 試算表就會做。七張表——對白、角色、關卡、道具、提示、故事、設定——照範本填。',
    art: <FillingGrid />,
  },
  {
    title: '手機掃一下就開玩',
    desc: '貼上試算表連結，當場生成，再叫出 QR 給玩家掃。改了試算表，重新整理就是新版。',
    art: <ScanQr />,
  },
  {
    title: '遊戲留在你手上',
    desc: '遊戲內容住在你自己的雲端硬碟。謎生不收、不存，也不用架任何伺服器。',
    art: (
      <IconArt>
        <CloudDoneRoundedIcon />
      </IconArt>
    ),
  },
  {
    title: '開源，拿去用',
    desc: '程式碼以 AGPL-3.0 開源。想改玩法、加道具，或自己架一份，都可以。',
    art: (
      <IconArt>
        <GitHubIcon />
      </IconArt>
    ),
    href: 'https://github.com/cooldongdong/MiSheng-App',
  },
];

// 卡片：游標附近的邊框會亮。跟 hero 一樣，位置寫 CSS 變數不進 state
const Card = ({ title, desc, art, href, index }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--cx', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--cy', `${e.clientY - r.top}px`);
  };
  return (
    <Box
      ref={ref}
      component={motion.a}
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      onPointerMove={onMove}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      sx={{
        position: 'relative',
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        p: 3.5,
        borderRadius: 4,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        cursor: href ? 'pointer' : 'default',
        transition: 'transform 200ms, border-color 200ms',
        '&:hover': { transform: 'translateY(-3px)' },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: (t) =>
            `radial-gradient(320px circle at var(--cx, 50%) var(--cy, 50%), rgba(${t.vars.palette.secondary.mainChannel} / 0.12), transparent 60%)`,
          opacity: 0,
          transition: 'opacity 300ms',
          pointerEvents: 'none',
        },
        '&:hover::before': { opacity: 1 },
      }}
    >
      <Box sx={{ height: 120, display: 'flex', alignItems: 'center' }}>{art}</Box>
      <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color: 'text.primary', mt: 2 }}>{title}</Typography>
      <Typography sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.85 }}>{desc}</Typography>
    </Box>
  );
};
Card.propTypes = {
  title: PropTypes.string,
  desc: PropTypes.string,
  art: PropTypes.node,
  href: PropTypes.string,
  index: PropTypes.number,
};

const Features = () => (
  <Box component="section" sx={{ px: 2, py: { xs: 10, md: 14 }, bgcolor: tint('secondary', 0.03) }}>
    <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
      <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.6rem', md: '2.4rem' }, color: 'text.primary' }}>
        為什麼是謎生
      </Typography>
      <Box
        sx={{
          mt: 5,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2.5,
        }}
      >
        {CARDS.map((c, i) => (
          <Card key={c.title} {...c} index={i} />
        ))}
      </Box>
    </Box>
  </Box>
);

export default Features;
