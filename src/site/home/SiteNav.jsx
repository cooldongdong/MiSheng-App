import { useEffect, useState } from 'react';
import { Box, Button, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { motion, useReducedMotion } from 'motion/react';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import TocRoundedIcon from '@mui/icons-material/TocRounded';
import ColorSchemeToggle from '../../shared/ColorSchemeToggle';
import BrandMark from '../../shared/BrandMark';

// 頂部導覽列。頁面長到七段之後，第一次來的人需要知道「還有什麼」以及「我在哪」。
//
// 為什麼是頂部一條，不是側邊大綱：內容欄寬 1160，1440 的螢幕兩側只剩 140px，
// 放不下有字的大綱；而手機上側欄只能收成抽屜，等於還是一顆按鈕。
// 頂部一條在桌機直接攤開段落，手機收成「目錄」一顆，兩種寬度用同一份清單。
//
// 在 hero 時是透明的，往下捲才長出底色與分隔線：hero 本身就是一張完整的封面，
// 不需要一條實心的列壓在上面。
// 「我在哪」用 IntersectionObserver 量，不聽 scroll——只在跨段時才更新。

const SECTIONS = [
  { id: 'how', label: '運作方式' },
  { id: 'screens', label: '畫面與道具' },
  { id: 'navbar', label: '導覽列' },
  { id: 'try', label: '試試看' },
  { id: 'start', label: '開始' },
  { id: 'why', label: '為什麼' },
];
const NAV_H = 56;

const useActiveSection = () => {
  const [active, setActive] = useState(null);
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    // 畫面中間那條線落在哪一段，哪一段就亮。hero 不在清單裡：在 hero 時什麼都不亮
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
          else setActive((cur) => (cur === e.target.id ? null : cur));
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
};

const useScrolled = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return scrolled;
};

const SiteNav = () => {
  const active = useActiveSection();
  const scrolled = useScrolled();
  const reduce = useReducedMotion();
  const [menuAt, setMenuAt] = useState(null);

  const go = (id) => (e) => {
    e.preventDefault();
    setMenuAt(null);
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        height: NAV_H,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        transition: 'background-color 250ms, border-color 250ms, backdrop-filter 250ms',
        bgcolor: scrolled ? (t) => `rgba(${t.vars.palette.background.defaultChannel} / 0.82)` : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid',
        borderColor: scrolled ? 'divider' : 'transparent',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 1160, mx: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Stack
          component="a"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
            history.replaceState(null, '', location.pathname);
          }}
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ textDecoration: 'none', color: 'text.primary', flexShrink: 0 }}
        >
          <BrandMark size={28} />
          <Typography sx={{ fontWeight: 800, letterSpacing: '0.05em', fontSize: '0.95rem' }}>謎生 MiSheng</Typography>
        </Stack>

        {/* 桌機：段落直接攤開 */}
        <Box component="nav" aria-label="首頁段落" sx={{ display: { xs: 'none', md: 'flex' }, mx: 'auto', gap: 0.5 }}>
          {SECTIONS.map(({ id, label }) => {
            const on = active === id;
            return (
              <Box
                key={id}
                component="a"
                href={`#${id}`}
                onClick={go(id)}
                aria-current={on ? 'true' : undefined}
                sx={{
                  position: 'relative',
                  px: 1.5,
                  py: 0.75,
                  fontSize: '0.88rem',
                  fontWeight: on ? 700 : 500,
                  color: on ? 'text.primary' : 'text.secondary',
                  textDecoration: 'none',
                  borderRadius: 99,
                  transition: 'color 200ms',
                  '&:hover': { color: 'text.primary' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main' },
                }}
              >
                {label}
                {on && (
                  <Box
                    component={motion.span}
                    layoutId="site-nav-dot"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      bottom: 0,
                      width: 5,
                      height: 5,
                      ml: '-2.5px',
                      borderRadius: '50%',
                      bgcolor: 'secondary.main',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: { xs: 'auto', md: 0 }, flexShrink: 0 }}>
          <Button
            href="/docs/"
            size="small"
            startIcon={<MenuBookRoundedIcon />}
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, textTransform: 'none', color: 'text.secondary', borderRadius: 99, px: 1.5 }}
          >
            文件
          </Button>
          {/* 手機：收成一顆「目錄」 */}
          <IconButton
            aria-label="目錄"
            aria-haspopup="menu"
            onClick={(e) => setMenuAt(e.currentTarget)}
            sx={{ display: { md: 'none' } }}
          >
            <TocRoundedIcon />
          </IconButton>
          <ColorSchemeToggle />
        </Stack>
      </Box>

      <Menu
        anchorEl={menuAt}
        open={Boolean(menuAt)}
        onClose={() => setMenuAt(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              minWidth: 200,
              borderRadius: '14px',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 18px 40px -20px rgba(38,50,56,.5)',
            },
          },
          list: { sx: { p: 0.75 } },
        }}
      >
        {SECTIONS.map(({ id, label }) => (
          <MenuItem
            key={id}
            component="a"
            href={`#${id}`}
            onClick={go(id)}
            selected={active === id}
            sx={{ borderRadius: '8px', fontWeight: active === id ? 700 : 400 }}
          >
            {label}
          </MenuItem>
        ))}
        <MenuItem component="a" href="/docs/" sx={{ borderRadius: '8px', display: { sm: 'none' } }}>
          文件
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SiteNav;
