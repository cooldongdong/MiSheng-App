import {
  Box,
  Button,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const GITHUB_URL = 'https://github.com/cooldongdong/MiSheng-App';

const INK = '#263238';
const BODY = '#546e7a';
const MUTED = '#90a4ae';
const ACCENT = '#37474f';

// 首頁的兩個主要入口。做成可點的卡片，手感沿用 /create 的拖放區。
const entries = [
  {
    href: '/create',
    icon: <AutoFixHighRoundedIcon sx={{ fontSize: 32, color: ACCENT }} />,
    title: '即時轉化',
    desc: '貼上試算表連結，或把資料夾丟進來——當場檢查、當場試玩。',
  },
  {
    href: '/demo',
    icon: <SportsEsportsRoundedIcon sx={{ fontSize: 32, color: ACCENT }} />,
    title: '玩玩看 demo',
    desc: '「多列宇宙」：一款用謎生做出來的實境解謎，直接開玩。',
  },
];

const steps = [
  ['填一份試算表', '照範本填 7 張表：關卡、對白、提示、道具。'],
  ['謎生幫你檢查', '哪張表哪一格有問題，先講清楚，不丟你一個白畫面。'],
  ['當場變成遊戲', '手機打開就能玩，不用寫一行程式。'],
];

const HomeApp = () => (
  <Box
    sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      px: 2,
      py: { xs: 6, sm: 10 },
    }}
  >
    <Box sx={{ width: '100%', maxWidth: 760 }}>
      {/* Hero */}
      <Typography
        variant="overline"
        sx={{ color: MUTED, letterSpacing: 3 }}
      >
        MISHENG · 謎生
      </Typography>
      <Typography
        component="h1"
        sx={{
          color: INK,
          fontWeight: 800,
          fontSize: { xs: '2rem', sm: '2.8rem' },
          lineHeight: 1.3,
          mt: 1,
        }}
      >
        把一份試算表，
        <br />
        變成手機就能玩的實境解謎。
      </Typography>
      <Typography
        sx={{ color: BODY, fontSize: '1.05rem', mt: 2.5, lineHeight: 1.9 }}
      >
        謎生是一套開源工具。你只要填好一份試算表，剩下的交給它——
        不用寫程式，也不用架伺服器。
      </Typography>

      {/* 兩個主要入口 */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 5 }}
      >
        {entries.map((e) => (
          <Box
            key={e.href}
            component="a"
            href={e.href}
            sx={{
              flex: 1,
              display: 'block',
              textDecoration: 'none',
              p: 3,
              border: '1px solid #cfd8dc',
              borderRadius: 3,
              bgcolor: '#fafafa',
              transition: 'all 160ms ease',
              '&:hover': {
                borderColor: '#90a4ae',
                bgcolor: '#f5f7f8',
                transform: 'translateY(-2px)',
              },
            }}
          >
            {e.icon}
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ mt: 1.5 }}
            >
              <Typography
                sx={{ color: INK, fontWeight: 700, fontSize: '1.15rem' }}
              >
                {e.title}
              </Typography>
              <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: MUTED }} />
            </Stack>
            <Typography sx={{ color: BODY, mt: 1, lineHeight: 1.8 }}>
              {e.desc}
            </Typography>
          </Box>
        ))}
      </Stack>

      {/* 怎麼運作 */}
      <Box sx={{ mt: 8 }}>
        <Typography sx={{ color: MUTED, letterSpacing: 2, mb: 3 }}>
          怎麼運作
        </Typography>
        <Stack spacing={3}>
          {steps.map(([title, desc], i) => (
            <Stack key={title} direction="row" spacing={2.5} alignItems="flex-start">
              <Typography
                sx={{
                  color: ACCENT,
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  lineHeight: 1.4,
                  minWidth: 28,
                }}
              >
                {i + 1}
              </Typography>
              <Box>
                <Typography sx={{ color: INK, fontWeight: 700 }}>
                  {title}
                </Typography>
                <Typography sx={{ color: BODY, mt: 0.5, lineHeight: 1.8 }}>
                  {desc}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          mt: 8,
          pt: 4,
          borderTop: '1px solid #eceff1',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" sx={{ color: MUTED }}>
          開源專案 · 歡迎自己拿去用
        </Typography>
        <Button
          component={Link}
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          startIcon={<GitHubIcon />}
          sx={{ color: ACCENT, textTransform: 'none' }}
        >
          GitHub
        </Button>
      </Box>
    </Box>
  </Box>
);

export default HomeApp;
