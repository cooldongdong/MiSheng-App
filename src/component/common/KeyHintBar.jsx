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
  LeftGlyph,
  RightGlyph,
  BackspaceGlyph,
} from './KeyCap';

// 遊戲欄頂端那一列，只講一件事：這一頁鍵盤可以按什麼。
//
// 原本這裡是 ModelTestInfo（印 Current Model: X ＋ 一顆清存檔的鈕）。那兩樣都是沒有
// 流程圖的年代留下的：model 現在看圖上的節點顏色與標籤就知道，清存檔是玩家端的功能
// （已移到 /demo 右上角）。
//
// 提示的內容由 kind 決定、在這裡畫成 icon，而不是讓 GameController 傳一句字串進來：
// 字串只能寫 ↑↓⌫ 那些 Unicode 字，而那些字的寬高在不同字型裡差很多（鍵位表已經為此
// 全面換成 icon，提示列再用字元就是同一個畫面上兩套寫法）。

// 一行提示：icon 與文字混排，交給 flex 對齊，不靠行高硬湊
const Line = ({ children }) => (
  <Stack direction="row" alignItems="center" spacing={0.25} component="span">
    {children}
  </Stack>
);
Line.propTypes = { children: PropTypes.node.isRequired };

const Sep = () => (
  <Box component="span" sx={{ mx: 0.5, opacity: 0.5 }}>
    ·
  </Box>
);

const BackHint = () => (
  <>
    <Sep />
    <BackspaceGlyph />
    <Box component="span" sx={{ ml: 0.25 }}>
      回剛才那頁
    </Box>
  </>
);

const PrevHint = () => (
  <>
    <Sep />
    <UpGlyph />
    <Box component="span" sx={{ ml: 0.25 }}>
      上一步
    </Box>
  </>
);

const HINTS = {
  map: (
    <Line>
      <UpGlyph />
      <DownGlyph />
      <LeftGlyph />
      <RightGlyph />
      <Box component="span" sx={{ ml: 0.25 }}>
        走圖上的位置
      </Box>
      <BackHint />
    </Line>
  ),
  wentBack: <Line>已回退，變數與關卡進度不會跟著倒回</Line>,
  quiz: (
    <Line>
      按數字選選項
      <PrevHint />
    </Line>
  ),
  input: (
    <Line>
      Esc 離開輸入框
      <PrevHint />
    </Line>
  ),
  flow: (
    <Line>
      <UpGlyph />
      <DownGlyph />
      <Box component="span" sx={{ ml: 0.25 }}>
        走流程
      </Box>
      <BackHint />
    </Line>
  ),
  back: (
    <Line>
      <UpGlyph />
      <Box component="span" sx={{ ml: 0.25 }}>
        上一步
      </Box>
      <BackHint />
    </Line>
  ),
};

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

const KeyHintBar = ({ kind }) => {
  const { mapMode, setMapMode } = useContext(GameContext);
  const [anchor, setAnchor] = useState(null);

  if (!kind || !HINTS[kind]) return null;

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
          component="div"
          sx={{
            // 這行字坐在遊戲插圖上，純灰字會被背景吃掉——墊一層半透明才讀得到
            px: 1,
            py: '2px',
            borderRadius: 2,
            bgcolor: 'background.overlay',
            color: 'text.secondary',
          }}
        >
          {HINTS[kind]}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            bgcolor: 'background.overlay',
            color: 'text.secondary',
            // 預設的 action.hover 是半透明的，疊在同樣半透明的 overlay 上幾乎看不出
            // 變化（淺色模式尤其明顯）。改成直接換成不透明的面板色 ＋ 提亮文字。
            '&:hover': { bgcolor: 'background.paper', color: 'text.primary' },
          }}
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
        {/* 寬度寫死：兩種模式的說明長度不同，讓它自己撐的話每切一次就跳一次寬度 */}
        <Box sx={{ p: 1.5, width: 288, boxSizing: 'border-box' }}>
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
          {/* 固定高度：兩段說明的行數不同，不撐住的話整塊會上下抽動 */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 0.75,
              minHeight: 48,
              color: 'text.disabled',
            }}
          >
            {mapMode
              ? '↑↓←→ 走流程圖上的位置，並排的節點可以左右互換。Quiz 與輸入框都攔不住它。'
              : '↑↓ 沿著遊戲會走的路徑。左右鍵在這個模式沒有作用。'}
          </Typography>

          <Divider sx={{ mb: 1.25 }} />

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
  kind: PropTypes.oneOf([...Object.keys(HINTS), null]),
};

export default KeyHintBar;
