import PropTypes from 'prop-types';
import { IconButton, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import BrightnessAutoRoundedIcon from '@mui/icons-material/BrightnessAutoRounded';

// 三態循環：跟隨系統 → 淺色 → 深色 → 跟隨系統
//
// 為什麼不是「亮／暗」兩態：兩態的話，使用者一旦碰過開關就再也回不到「跟隨系統」，
// 而跟隨系統才是多數人真正要的行為（天黑了畫面自己會暗）。把 system 留在循環裡，
// 誤觸的成本就只是多按兩下。
//
// 狀態與記憶由 MUI 的 useColorScheme 負責（localStorage key: mui-mode），
// 這裡不自己存——自己存就會有兩份真相，而重整時讀到哪一份是看載入順序。
const NEXT = { system: 'light', light: 'dark', dark: 'system' };
const LABEL = { system: '跟隨系統', light: '淺色', dark: '深色' };
const ICON = {
  system: BrightnessAutoRoundedIcon,
  light: LightModeRoundedIcon,
  dark: DarkModeRoundedIcon,
};

const ColorSchemeToggle = ({ size = 'small' }) => {
  const { mode, setMode } = useColorScheme();
  // 第一次 render（還沒讀到 localStorage）時 mode 是 undefined。
  // 這時候先不畫，畫了會閃一下錯的圖示。
  if (!mode) return null;

  const Icon = ICON[mode];
  return (
    <Tooltip title={`外觀：${LABEL[mode]}（點一下切換）`}>
      <IconButton
        size={size}
        onClick={() => setMode(NEXT[mode])}
        aria-label={`切換外觀，目前是${LABEL[mode]}`}
      >
        <Icon fontSize={size} color={mode === 'system' ? 'inherit' : 'secondary'} />
      </IconButton>
    </Tooltip>
  );
};

ColorSchemeToggle.propTypes = { size: PropTypes.string };

export default ColorSchemeToggle;
