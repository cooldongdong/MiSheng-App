import { Box, Button, Link, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { motion } from 'motion/react';
import BrandMark from '../../shared/BrandMark';

const GITHUB_URL = 'https://github.com/cooldongdong/MiSheng-App';

// 結尾：最後一次把兩個入口擺出來，再加 footer。
const Outro = () => (
  <Box component="section" sx={{ px: 2, pt: { xs: 12, md: 18 }, pb: 5 }}>
    <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        sx={{ textAlign: 'center' }}
      >
        <Box
          component={motion.div}
          initial={{ rotate: -12, scale: 0.8 }}
          whileInView={{ rotate: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.2 }}
          sx={{ display: 'inline-block' }}
        >
          <BrandMark size={88} />
        </Box>
        <Typography
          component="h2"
          sx={{ fontWeight: 800, fontSize: { xs: '1.9rem', md: '3rem' }, mt: 2, color: 'text.primary', lineHeight: 1.3 }}
        >
          下一個謎題，
          <Box component="span" sx={{ color: 'secondary.main' }}>
            由你來出。
          </Box>
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.9 }}>
          打開試算表，填下第一句對白。
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" sx={{ mt: 4 }}>
          <Button
            href="/create"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardRoundedIcon />}
            sx={{ borderRadius: 99, px: 3.5, py: 1.4, textTransform: 'none', fontSize: '1rem', boxShadow: 'none' }}
          >
            開始做遊戲
          </Button>
          <Button
            href="/demo"
            variant="outlined"
            size="large"
            sx={{
              borderRadius: 99,
              px: 3.5,
              py: 1.4,
              textTransform: 'none',
              fontSize: '1rem',
              color: 'text.primary',
              borderColor: 'divider',
              '&:hover': { borderColor: 'text.secondary' },
            }}
          >
            玩玩 demo
          </Button>
        </Stack>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          mt: { xs: 12, md: 16 },
          pt: 4,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            開源專案 · 歡迎自己拿去用
          </Typography>
          {/* demo 素材是 CC BY-NC 4.0，用在首頁就要標出處（見 CLAUDE.md 的授權邊界） */}
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
            示範畫面的圖與對白取自 demo 遊戲《MiSheng 的多列宇宙》，以 CC BY-NC 4.0 授權。
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {/*
            文件擺在 GitHub 前面：**要用這個工具的人先需要的是文件，不是原始碼。**
          */}
          <Button
            component={Link}
            href="/docs"
            startIcon={<MenuBookRoundedIcon />}
            sx={{ color: 'primary.main', textTransform: 'none' }}
          >
            文件
          </Button>
          <Button
            component={Link}
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            startIcon={<GitHubIcon />}
            sx={{ color: 'primary.main', textTransform: 'none' }}
          >
            GitHub
          </Button>
        </Stack>
      </Box>
    </Box>
  </Box>
);

export default Outro;
