import { useState } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Stack,
  Typography,
} from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import PropTypes from 'prop-types';
import KeyCap from './KeyCap';
import { FILL_HINT, SKIP_HINT } from '../../hook/useAnswerShortcuts';

// 遊戲欄頂端那一列，現在只講一件事：這一頁鍵盤可以按什麼。
//
// 原本這裡是 ModelTestInfo（印 Current Model: X ＋ 一顆清存檔的鈕）。那兩樣都是
// 沒有流程圖的年代留下的：model 現在看圖上的節點顏色與標籤就知道，而清存檔是玩家端
// 的功能、不該擠在創作者的工具列裡（已移到 /demo 右上角）。
//
// 常駐一行簡短提示 ＋ 一顆問號展開完整鍵位表：一行字放不下九個鍵，但完全收起來
// 又會讓人不知道有鍵盤可用。
const ROWS = [
  ['↓', '下一步'],
  ['↑', '上一步（照流程圖的位置）'],
  ['⌫', '回到剛才那一頁'],
  ['1-9', '選 Quiz 的選項'],
  ['Enter', '送出答案／確認對話框'],
  [null, '自動作答並送出', FILL_HINT],
  [null, '略過這題', SKIP_HINT],
  ['Esc', '把游標放出輸入框'],
];

const KeyHintBar = ({ hint, mapMode = false }) => {
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
        <Box sx={{ p: 1.5, minWidth: 220 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            鍵盤
          </Typography>
          <Stack spacing={0.75} sx={{ mt: 0.75 }}>
            {ROWS.map(([cap, label, dynamicCap]) => (
              <Stack key={label} direction="row" alignItems="center" spacing={1}>
                <Box sx={{ minWidth: 56, color: 'text.primary' }}>
                  <KeyCap>{dynamicCap ? dynamicCap() : cap}</KeyCap>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 1.25, color: 'text.disabled' }}
          >
            {mapMode
              ? '目前是地圖模式：↑↓←→ 走流程圖上的位置，Quiz 與輸入框都攔不住它。'
              : '工具列的四向箭頭可以切成地圖模式：↑↓←→ 改成走流程圖上的位置。'}
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
};

KeyHintBar.propTypes = {
  hint: PropTypes.string,
  mapMode: PropTypes.bool,
};

export default KeyHintBar;
