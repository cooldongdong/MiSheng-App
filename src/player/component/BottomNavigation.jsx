import { useContext } from 'react';
import { Badge, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { GameContext } from '../store/game-context';
import useHintTick from '../hook/useHintTick';
import { dueHintIndexes } from '../game/hintTimer';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import HomeRepairServiceRoundedIcon from '@mui/icons-material/HomeRepairServiceRounded';
import QuestionAnswerRoundedIcon from '@mui/icons-material/QuestionAnswerRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import PropTypes from 'prop-types';

// 五顆平等的圖示等於沒有「家」。
//
// **解謎是遊戲本體，玩家 90% 的時間在那裡；其餘四個是卡住或好奇時才去的參考頁。**
// 但它們原本長得一模一樣、一樣大、一樣重，於是玩家點進道具之後不是「找不到回去的
// 路」，是**不知道有一條路要回去**——他不覺得自己離開了什麼地方
//（Dong 2026-09-07：「用完道具後會不知道要去哪裡答題」）。
//
// 所以做出主從：解謎的圖示大一號、未選中時也是有顏色的；其餘四個未選中時是灰的。
// **不加任何新控制項**——那個問題的根源是版面沒講清楚主從，補一顆「回解謎」的鈕
// 是在補洞，不是修因。
const primarySx = {
  color: 'secondary.main',
  '&.Mui-selected': { color: 'secondary.main' },
  // 主要的那一顆連未選中時都要看得出是主要的，所以字也粗一點
  '& .MuiBottomNavigationAction-label': { fontWeight: 600 },
};

const secondarySx = {
  color: 'text.disabled',
  '&.Mui-selected': { color: 'text.primary' },
};

export default function FixedBottomNavigation({ value, onChange }) {
  const { hintData, currentMissionId, unlockedHints, missionStartedAt } =
    useContext(GameContext);
  // 進關時刻一變就立刻重算，不必等下一次心跳（見 useHintTick 的說明）
  const now = useHintTick(missionStartedAt?.[currentMissionId]);

  // 「時間到了但還沒被解鎖」的數量。
  //
  // 不需要額外記「玩家看過了沒」——他一打開提示頁，那些就被解鎖了，這個數字
  // 自然歸零。少一份狀態，就少一個會跟事實不同步的地方。
  //
  // 為什麼要有這顆紅點：自動解鎖的提示是靜靜出現在提示頁的，而**卡住的人正盯著
  // 謎題，不會想到去翻提示頁**——沒有這個訊號，這個功能救不到它要救的人。
  const dueCount = dueHintIndexes(
    Array.isArray(hintData)
      ? hintData.filter((row) => row.missionId === currentMissionId)
      : [],
    missionStartedAt?.[currentMissionId],
    unlockedHints?.[currentMissionId],
    now
  ).length;

  return (
    <BottomNavigation
      sx={{
        position: 'relative',
        bottom: 0, // 固定在畫面底部
        width: '100%',
        maxWidth: '600px',
        margin: 'auto',
        // 底色必須跟著 theme 走。寫死淺色的話，深色模式下 icon 與文字會照樣吃到
        // theme 的 text.secondary（淺灰），淺灰畫在近白底上就是看不見。
        backgroundColor: 'game.nav',
        boxShadow: '0 -1px 5px rgba(0, 0, 0, 0.1)', // 輕微陰影
      }}
      value={value}
      onChange={onChange}
      showLabels
    >
      <BottomNavigationAction label="關卡" icon={<StorageRoundedIcon />} sx={secondarySx} />
      <BottomNavigationAction
        label="道具"
        icon={<HomeRepairServiceRoundedIcon />}
        sx={secondarySx}
      />
      <BottomNavigationAction
        label="解謎"
        icon={<QuestionAnswerRoundedIcon sx={{ fontSize: 30 }} />}
        sx={primarySx}
      />
      <BottomNavigationAction
        label="提示"
        icon={
          <Badge badgeContent={dueCount} color="error">
            <TipsAndUpdatesRoundedIcon />
          </Badge>
        }
        sx={secondarySx}
      />
      <BottomNavigationAction label="故事" icon={<AutoStoriesRoundedIcon />} sx={secondarySx} />
    </BottomNavigation>
  );
}

FixedBottomNavigation.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
