import { useContext, useState, useRef, useLayoutEffect } from 'react';
import {
  Box,
  ClickAwayListener,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
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
  // 不寫「變數與關卡進度不會跟著倒回」：nowrap 之後那一句會把膠囊撐得比遊戲欄還寬
  // （最窄 300px），完整說明留在展開後的鍵位表裡
  wentBack: <Line>已回退，狀態不會倒回</Line>,
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

// 鍵位表分兩區。
//
// 上半區**隨模式變**：切到照圖走之後，↑↓ 不再是「上一步／下一步」而是「走上下一層」，
// 表上照舊寫著舊語意就是在說謊。前一版是用一段散文補充說明去蓋掉這個矛盾——那段
// 散文其實是在替表格的錯誤打補丁，而且為了切換時不跳高度還得撐 minHeight，於是
// 變成一塊有空洞的字擠在標題與表格之間。讓表格自己跟著模式走，那段散文就不必存在。
//
// 兩邊都排三行，所以切換時高度天然一致，不用撐。
const DIRECTION_ROWS = {
  flow: [
    [<DownGlyph key="d" />, '下一步'],
    [<UpGlyph key="u" />, '上一步'],
    [<BackspaceGlyph key="b" />, '回到剛才那一頁'],
  ],
  map: [
    [
      <>
        <UpGlyph key="u" />
        <DownGlyph key="d" />
      </>,
      '走上下一層',
    ],
    [
      <>
        <LeftGlyph key="l" />
        <RightGlyph key="r" />
      </>,
      '同一層的左右鄰居',
    ],
    [<BackspaceGlyph key="b" />, '回到剛才那一頁'],
  ],
};

const OTHER_ROWS = [
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

const KeyRow = ({ cap, label }) => (
  <Stack direction="row" alignItems="center" spacing={1}>
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
);
KeyRow.propTypes = {
  cap: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
};

// 展開時的寬度。遊戲欄最窄是 300px（GameShell 的夾擠下限），所以 288 塞得下。
const EXPANDED_W = 288;

const KeyHintBar = ({ kind }) => {
  const { mapMode, setMapMode } = useContext(GameContext);
  const [open, setOpen] = useState(false);
  const rowRef = useRef(null);
  const [collapsedW, setCollapsedW] = useState(null);

  // 量那條列的自然寬度，展開／收合才有兩個都是數字的端點可以補間——width: auto 是
  // 插值不了的，不量就只能瞬間跳寬，那就不是「同一個東西長大」了。
  //
  // **展開時也要量**：模式可以從流程圖工具列那邊切換，那時提示文字會變長；只在收起時
  // 量的話，收合回去用的還是上一種模式的舊寬度。
  //
  // 而量得準的前提是那條列不會被壓縮（見下面的 nowrap / flexShrink）——fit-content 在
  // 空間不夠時會退讓，於是文字被壓著換行，下一次又量到那個被壓過的寬度，就再也回不來了。
  useLayoutEffect(() => {
    setCollapsedW(rowRef.current?.offsetWidth ?? null);
  }, [kind, open, mapMode]);

  if (!kind || !HINTS[kind]) return null;

  const directionRows = DIRECTION_ROWS[mapMode ? 'map' : 'flow'];

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
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        {/* 收起是一條膠囊、展開是一張卡片，但**是同一個元素**在長大：寬度與圓角補間、
            高度用 grid 0fr→1fr。中心點不動，所以展開的內容天然跟提示列對齊——
            前一版用 Popover，anchor 是右邊那顆問號鈕，浮層就永遠偏在一邊。 */}
        <Box
          sx={{
            width: open ? EXPANDED_W : (collapsedW ?? 'auto'),
            maxWidth: '100%',
            bgcolor: 'background.overlay',
            // border-radius 刻意**不進 transition**：999px → 14px 是數值插值，而
            // border-radius 會被 clamp 在高度的一半；展開時高度同時從 26px 長到 300px，
            // 那個上限跟著變大，中間某一刻真的會鼓成 150px 的大圓角。瞬間切換反而無感
            // ——999px 在 26px 高的膠囊上本來就渲染成 13px，跟 14px 幾乎一樣。
            borderRadius: open ? '14px' : '999px',
            boxShadow: open ? 3 : 0,
            overflow: 'hidden',
            transition: (theme) =>
              theme.transitions.create(['width', 'box-shadow'], {
                duration: 260,
                easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
              }),
          }}
        >
          <Stack
            ref={rowRef}
            direction="row"
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
            sx={{
              // 不換行、不退讓：這兩件事讓 offsetWidth 永遠等於內容的真實寬度，
              // 量測才不會被自己上一次的結果越縮越小
              whiteSpace: 'nowrap',
              flexShrink: 0,
              width: 'fit-content',
              mx: 'auto',
              pl: 1.25,
              pr: 0.5,
              py: '2px',
            }}
          >
            <Typography
              variant="caption"
              component="div"
              sx={{ color: 'text.secondary' }}
            >
              {HINTS[kind]}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setOpen((v) => !v)}
              sx={{
                color: 'text.secondary',
                // 預設的 action.hover 是半透明的，疊在同樣半透明的 overlay 上幾乎
                // 看不出變化（淺色模式尤其明顯）。改成不透明的面板色 ＋ 提亮文字。
                '&:hover': { bgcolor: 'background.paper', color: 'text.primary' },
              }}
            >
              {open ? (
                <CloseRoundedIcon sx={{ fontSize: 15 }} />
              ) : (
                <HelpOutlineRoundedIcon sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateRows: open ? '1fr' : '0fr',
              transition: (theme) =>
                theme.transitions.create('grid-template-rows', {
                  duration: 260,
                  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                }),
            }}
          >
            <Box sx={{ overflow: 'hidden' }}>
              <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  方向鍵
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  fullWidth
                  value={mapMode ? 'map' : 'flow'}
                  onChange={(e, next) => next && setMapMode(next === 'map')}
                  sx={{ mt: 0.75, mb: 1.25 }}
                >
                  <ToggleButton value="flow" sx={{ textTransform: 'none', py: 0.5 }}>
                    照流程走
                  </ToggleButton>
                  <ToggleButton value="map" sx={{ textTransform: 'none', py: 0.5 }}>
                    照圖走
                  </ToggleButton>
                </ToggleButtonGroup>

                <Stack spacing={0.75}>
                  {directionRows.map(([cap, label]) => (
                    <KeyRow key={label} cap={cap} label={label} />
                  ))}
                </Stack>

                <Divider sx={{ my: 1.25 }} />

                <Typography
                  variant="caption"
                  sx={{ display: 'block', mb: 0.75, color: 'text.disabled' }}
                >
                  其他
                </Typography>
                <Stack spacing={0.75}>
                  {OTHER_ROWS.map(([cap, label]) => (
                    <KeyRow key={label} cap={cap} label={label} />
                  ))}
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>
      </ClickAwayListener>
    </Box>
  );
};

KeyHintBar.propTypes = {
  kind: PropTypes.oneOf([...Object.keys(HINTS), null]),
};

export default KeyHintBar;
