import PropTypes from 'prop-types';
import { useContext, useState } from 'react';
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import BrightnessAutoRoundedIcon from '@mui/icons-material/BrightnessAutoRounded';
import { useColorScheme } from '@mui/material/styles';
import { GameContext } from '../../store/game-context';
import ExportEventsButton from './ExportEventsButton';
import RestartButton from './RestartButton';

// 遊戲畫面右上角的設定選單。
//
// **為什麼收成一顆。** 原本那裡有四顆平行的圖示（謎生標記／紀錄／重新開始／外觀），
// 而它們**全部都不是玩家在玩遊戲時要碰的東西**——它們跟遊戲爭同一塊注意力，
// 卻沒有一顆是玩家真正需要的（Dong 2026-09-07：「太多按鈕了」）。
//
// 收成一顆之後，右上角只剩「品牌標記」與「⋮」——前者是身分，後者是「這裡還有東西，
// 但你現在不需要」。
//
// **對話框由這裡持有，不由各自的按鈕持有。** 紀錄面板與重新開始原本各自是
// 「一顆鈕 ＋ 一個對話框」；現在觸發移到選單，那兩個元件就只剩受控的對話框。
// 這樣選單關掉之後對話框才留得住——選單一收起來就把它的子元件卸載，
// 對話框會跟著消失。
const NEXT_MODE = { system: 'light', light: 'dark', dark: 'system' };
const MODE_LABEL = { system: '跟隨系統', light: '淺色', dark: '深色' };
const MODE_ICON = {
  system: BrightnessAutoRoundedIcon,
  light: LightModeRoundedIcon,
  dark: DarkModeRoundedIcon,
};

const GameMenu = ({ onReplayTour = null }) => {
  const { gameId, eventCount } = useContext(GameContext);
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState(null);
  const [dialog, setDialog] = useState(null); // 'record' | 'restart' | null

  const close = () => setAnchor(null);
  const openDialog = (which) => {
    setDialog(which);
    close();
  };

  const ModeIcon = MODE_ICON[mode] || BrightnessAutoRoundedIcon;
  // 沒有事件就沒有紀錄可以交——一個按下去得到空檔的選項只會讓人以為壞了
  const hasRecord = !!gameId && !!eventCount;

  return (
    <>
      <Tooltip title="設定">
        <IconButton
          size="small"
          color="inherit"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="設定"
        >
          <MoreVertRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {/* 外觀擺第一個：它是唯一一個玩家在遊戲進行中可能真的想調的
            （走進室內、天黑了）。點一下就切，不關選單——連按兩下才回得到原本那個 */}
        <MenuItem
          onClick={() => setMode(NEXT_MODE[mode] || 'light')}
          disabled={!mode}
        >
          <ListItemIcon>
            <ModeIcon
              fontSize="small"
              color={mode === 'system' ? 'inherit' : 'secondary'}
            />
          </ListItemIcon>
          <ListItemText
            primary="外觀"
            secondary={MODE_LABEL[mode] || ''}
            slotProps={{ secondary: { variant: 'caption' } }}
          />
        </MenuItem>

        {/* 新手導覽只跑一次就記在 localStorage，而且是全域的（不掛 gameId）。
            沒有這個入口，手滑關掉的人就再也看不到了——COO-189 第 4 點。 */}
        {onReplayTour && (
          <MenuItem
            onClick={() => {
              onReplayTour();
              close();
            }}
          >
            <ListItemIcon>
              <HelpOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="新手導覽" secondary="再看一次" slotProps={{ secondary: { variant: 'caption' } }} />
          </MenuItem>
        )}

        {hasRecord && (
          <MenuItem onClick={() => openDialog('record')}>
            <ListItemIcon>
              <ReceiptLongRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="這場的遊戲紀錄"
              secondary={`${eventCount} 筆`}
              slotProps={{ secondary: { variant: 'caption' } }}
            />
          </MenuItem>
        )}

        {gameId && <Divider />}
        {gameId && (
          <MenuItem onClick={() => openDialog('restart')}>
            <ListItemIcon>
              <RestartAltRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="清除進度，重新開始" />
          </MenuItem>
        )}
      </Menu>

      {/* 對話框畫在選單外面——選單一關就會卸載它的子元件 */}
      <ExportEventsButton
        open={dialog === 'record'}
        onClose={() => setDialog(null)}
      />
      <RestartButton
        open={dialog === 'restart'}
        onClose={() => setDialog(null)}
      />
    </>
  );
};

GameMenu.propTypes = {
  onReplayTour: PropTypes.func,
};

export default GameMenu;
