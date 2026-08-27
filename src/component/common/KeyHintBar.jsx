import { useContext, useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  Popover,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import PropTypes from 'prop-types';
import { GameContext } from '../../store/game-context';
import KeyCap, {
  ModifierGlyph,
  ReturnGlyph,
  DownGlyph,
  UpGlyph,
  BackspaceGlyph,
} from './KeyCap';

// 遊戲欄頂端那一列，只講一件事：這一頁鍵盤可以按什麼。
//
// 原本這裡是 ModelTestInfo（印 Current Model: X ＋ 一顆清存檔的鈕）。那兩樣都是沒有
// 流程圖的年代留下的：model 現在看圖上的節點顏色與標籤就知道，清存檔是玩家端的功能
// （已移到 /demo 右上角）。
//
// 常駐一行簡短提示 ＋ 一顆問號展開完整鍵位表：一行字放不下八個鍵，但完全收起來又會
// 讓人不知道有鍵盤可用。模式切換也放進來——它跟「哪個鍵會做什麼」是同一個問題，
// 而流程圖工具列那顆四向箭頭離這件事太遠。
const ROWS = [
  [<DownGlyph key="d" />, '下一步'],
  [<UpGlyph key="u" />, '上一步'],
  [<BackspaceGlyph key="b" />, '回到剛才那一頁'],
  ['1-9', '選 Quiz 的選項'],
  ['Enter', '送出答案／確認對話框'],
  [
    <>
      <ModifierGlyph key="m" />
      <ReturnGlyph key="r" />
    </>,
    '自動作答並送出',
  ],
  [
    <>
      <ModifierGlyph key="m2" />
      <DownGlyph key="d2" />
    </>,
    '略過這題',
  ],
  ['Esc', '把游標放出輸入框'],
];

const KeyHintBar = ({ hint }) => {
  const { mapMode, setMapMode } = useContext(GameContext);
  const [anchor, setAnchor] = useState(null);

  if (!hint) return null;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '600px',
        // absolute 而非 fixed：並排流程圖時才不會跨到右半邊、擋住工具列
        position: 'absolute',
        top: 0,
        zIndex: 99,
        boxSizing: 'border-box',
        px: '20px',
        pt: '14px',
      }}
    >
      <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
        <Typography
          variant="caption"
          sx={{
            // 這行字坐在遊戲插圖上，純灰字會被背景吃掉——墊一層半透明才讀得到
            px: 1,
            py: '2px',
            borderRadius: 2,
            bgcolor: 'background.overlay',
            color: 'text.secondary',
          }}
        >
          {hint}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ bgcolor: 'background.overlay', color: 'text.secondary' }}
        >
          <HelpOutlineRoundedIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Stack>

      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box sx={{ p: 1.5, minWidth: 250 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            方向鍵怎麼走
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            fullWidth
            value={mapMode ? 'map' : 'flow'}
            onChange={(e, next) => next && setMapMode(next === 'map')}
            sx={{ mt: 0.75 }}
          >
            <ToggleButton value="flow" sx={{ textTransform: 'none', py: 0.5 }}>
              照流程走
            </ToggleButton>
            <ToggleButton value="map" sx={{ textTransform: 'none', py: 0.5 }}>
              照圖走
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 0.75, color: 'text.disabled' }}
          >
            {mapMode
              ? '↑↓←→ 走流程圖上的位置，並排的節點可以左右互換。Quiz 與輸入框都攔不住它。'
              : '↑↓ 沿著遊戲會走的路徑。左右鍵在這個模式沒有作用。'}
          </Typography>

          <Divider sx={{ my: 1.25 }} />

          <Stack spacing={0.75}>
            {ROWS.map(([cap, label]) => (
              <Stack key={label} direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    minWidth: 64,
                    display: 'flex',
                    justifyContent: 'flex-start',
                    color: 'text.primary',
                  }}
                >
                  <KeyCap>{cap}</KeyCap>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
};

KeyHintBar.propTypes = {
  hint: PropTypes.string,
};

export default KeyHintBar;
