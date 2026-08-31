import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import BrandMark from './BrandMark.jsx';
import QrCode from './QrCode.jsx';

const HOME = 'https://misheng.app';

// 「這個遊戲是用謎生做的」——一顆小標記，點開才展開說明。
//
// 它在四個畫面上是同一顆，但最重要的是**使用者自己部署的那一份**：那是謎生唯一
// 會出現在別人網域上的地方，也就是這個工具唯一會被下一個創作者看見的機會。
//
// ── 為什麼是「點開小卡」而不是直接連出去 ──────────────────────────
// 遊戲畫面上一顆一點就跳走的連結是危險的：玩家在解謎途中誤觸，畫面就換掉了。
// 多一步剛好就是那個確認。而且連結一律開新分頁（target=_blank），所以就算真的
// 點下去，他的遊戲還在原本那個分頁裡等他。
//
// ── 它同時是網站與網址設計 §2-5 的「made with 謎生」標記 ──────────
// 那份文件把免費／付費的分界線畫在「能不能長久留著」，而免費版帶標記、付費版
// 拿掉。所以 show 這個 prop 現在永遠是 true，但它存在——之後要拿掉標記時，
// 改的是傳進來的值，不必回頭找它散在哪幾個檔案。
//
// ── 為什麼 logo 當導覽這次是對的 ────────────────────────────────
// 2026-08-27 曾經把左上角的 logo 拿掉，理由是「沒有人會從一個品牌標誌看出
// 這會開關左邊的面板」。那次的問題是 logo 被拿去當**面板開關**；
// logo ＝ 這是誰做的／回到它的家，是網頁的通用慣例，不是同一件事。
// qrUrl：把「這一頁」變成一張可以掃的碼。
//
// 它跟卡片上半部講的不是同一件事——上面是「這個工具是誰做的」，這裡是「怎麼把
// 這一頁弄到手機上」。放在同一張卡而不是再長一顆按鈕，是因為遊戲畫面上每多一個
// 東西，就多一分擋住創作者美術的機會；而這兩件事至少共用「關於這一頁」這個框。
//
// 誰會用：①學員部署完，在桌機上掃碼確認手機真的打得開（那是部署文件的最後一步）
//         ②帶團的人現場打開遊戲，給玩家掃
const BrandBadge = ({ show = true, size = 20, tone = 'overlay', qrUrl = '' }) => {
  const [anchor, setAnchor] = useState(null);
  if (!show) return null;

  return (
    <>
      <Tooltip title="用謎生做的">
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="這個遊戲是用什麼做的"
          sx={
            tone === 'overlay'
              ? {
                  // 遊戲畫面上這顆坐在創作者的美術上，底要夠才看得見；
                  // 半透明是刻意的——它是標記，不是要跟遊戲搶注意力
                  bgcolor: 'background.overlay',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'background.paper' },
                }
              : undefined
          }
        >
          <BrandMark size={size} />
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2, maxWidth: 280, borderRadius: 2 } } }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} alignItems="center">
            <BrandMark size={22} />
            <Typography sx={{ fontWeight: 700 }}>謎生 Misheng</Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
            這個遊戲是用謎生做的——一套把試算表變成手機實境解謎的開源工具。
          </Typography>
          <Box>
            <Button
              size="small"
              variant="contained"
              href={HOME}
              // 一律開新分頁：玩到一半的人點下去，遊戲還在原本那個分頁等他
              target="_blank"
              rel="noreferrer"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
            >
              做一個自己的
            </Button>
          </Box>

          {qrUrl && (
            <>
              <Divider sx={{ mt: 0.5 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                用手機掃這個碼，就能在手機上打開這一頁
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <QrCode value={qrUrl} size={132} />
              </Box>
            </>
          )}
        </Stack>
      </Popover>
    </>
  );
};

BrandBadge.propTypes = {
  // 之後付費版拿掉標記時改這個，不必回頭找它長在哪幾處（§2-5）
  show: PropTypes.bool,
  size: PropTypes.number,
  // overlay ＝ 疊在遊戲畫面上，要自帶底；plain ＝ 放在面板裡，不用
  tone: PropTypes.oneOf(['overlay', 'plain']),
  // 有值才出現 QR 那一段。傳 window.location.href 就是「這一頁」
  qrUrl: PropTypes.string,
};

export default BrandBadge;
