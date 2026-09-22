import { useContext } from 'react';
import { Badge, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { GameContext } from '../store/game-context';
import useHintTick from '../hook/useHintTick';
import { freshHintIndexes } from '../game/hintTimer';
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
// 所以做出主從。**不加任何新控制項**——那個問題的根源是版面沒講清楚主從，
// 補一顆「回解謎」的鈕是在補洞不是修因，而且會讓那一排變成六顆。
//
// ## 為什麼是形狀不是顏色
//
// 第一版把解謎染成鏽橘、其餘四個灰色。實機一看就發現**兩種訊號在打架**：
// 站在道具頁時，「道具」是白的（＝你在這）、「解謎」是橘的（＝這是家），
// 而**橘色在多數介面裡就代表「選中」**——第一次玩的人可能以為自己在解謎那一頁。
// 而那正好是這個改動要救的族群。
//
// 所以改成：
//   · **家＝形狀**（一顆填色的圓，像很多 app 中間那顆主要按鈕）
//   · **你在這＝亮度**（選中的字變亮，沒選中的是灰的）
//
// 兩個訊號用兩個不同的維度，就不會互相冒充。而「中間一顆突出的主鈕」是玩家在別的
// app 上已經認得的語彙，不用學。
// 「你在這」那一半（選中＝亮起來）寫在 theme.js 的 MuiBottomNavigationAction
// override 裡，五顆共用——**它是狀態，不是身分**，不該由某一顆自己決定。
//
// 那條 override 原本是鏽橘，正是這次一起改掉的東西：橘色現在只講「家」。
// 一度想在這裡用 !important 壓過它，但那只是跟自己的 theme 打架——
// 兩個地方各講一半，下一個人改 theme 時看不到這裡的覆蓋。
const primarySx = {
  color: 'text.disabled',
  // 圖示放進一顆填色的圓裡。**圓不隨選中狀態改變**——它講的是「這是家」，
  // 那件事跟玩家現在在哪一頁無關。
  //
  // **尺寸的上限在縱向，不在橫向。** 圓直徑 46（＝圖示 26 ＋ padding 10）。
  // 375px 寬的手機上，圓跟左右鄰居的圖示還隔著 45px，橫向完全不緊；
  // 真正會先撞牆的是上下——圓靠負 margin 往上凸，直徑每加 6px 就多凸 5px，
  // 而「解謎」兩個字同時被往下擠。實測 38→46 是凸 6→12px、字底離列底 5→3px；
  // 再往上到 50 就變成凸 16px，開始壓到內容區。
  //
  // 放大時 fontSize 要跟著加。只加 padding 的話圓長大了、圖示沒有，
  // 主鈕會變成「一坨橘色中間一個小圖示」，反而顯得空。
  '& .MuiSvgIcon-root': {
    fontSize: 26,
    color: 'secondary.contrastText',
    bgcolor: 'secondary.main',
    borderRadius: '50%',
    p: '10px',
    boxSizing: 'content-box',
    mt: '-15px',
    mb: '2px',
  },
};

const secondarySx = { color: 'text.disabled' };

// data-tour：新手導覽用來量位置的標記（見 common/OnboardingTour）。
// 用 data 屬性而不是 ref，是因為導覽是**另一棵子樹**裡的元件，
// 而它要指的是這一排裡的某一顆——ref 得一路傳出去，data 屬性只要 querySelector。
export default function FixedBottomNavigation({ value, onChange }) {
  const { hintData, currentMissionId, hintsSeenAt, missionStartedAt } =
    useContext(GameContext);
  // 進關時刻一變就立刻重算，不必等下一次心跳（見 useHintTick 的說明）
  const now = useHintTick(missionStartedAt?.[currentMissionId]);

  // 「在你上次看提示頁之後才到期」的數量。
  //
  // 為什麼要有這顆紅點：自動解鎖的提示是靜靜出現在提示頁的，而**卡住的人正盯著
  // 謎題，不會想到去翻提示頁**——沒有這個訊號，這個功能救不到它要救的人。
  //
  // 原本問的是「到期但還沒解鎖」，歸零靠的是「玩家一打開提示頁那些就被解鎖了」
  // ——也就是**通知的清除是解鎖的副作用**。自動解鎖搬到 provider、變成一到期就做
  // 之後，那個集合永遠是空的，紅點會整個消失。所以改成拿到期時刻跟 hintsSeenAt
  // 比（見 hintTimer 的 freshHintIndexes）。語意沒變，只是不再借別人的副作用。
  const dueCount = freshHintIndexes(
    Array.isArray(hintData)
      ? hintData.filter((row) => row.missionId === currentMissionId)
      : [],
    missionStartedAt?.[currentMissionId],
    hintsSeenAt?.[currentMissionId],
    now
  ).length;

  return (
    <BottomNavigation
      data-tour="nav"
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
        // 主鈕的圓往上凸 10px，這一排要留得住它，不然會被上緣裁掉
        overflow: 'visible',
      }}
      value={value}
      onChange={onChange}
      showLabels
    >
      <BottomNavigationAction
        data-tour="missions"
        label="關卡"
        icon={<StorageRoundedIcon />}
        sx={secondarySx}
      />
      <BottomNavigationAction
        data-tour="props"
        label="道具"
        icon={<HomeRepairServiceRoundedIcon />}
        sx={secondarySx}
      />
      <BottomNavigationAction
        data-tour="play"
        label="解謎"
        icon={<QuestionAnswerRoundedIcon />}
        sx={primarySx}
      />
      <BottomNavigationAction
        data-tour="hints"
        label="提示"
        icon={
          <Badge badgeContent={dueCount} color="error">
            <TipsAndUpdatesRoundedIcon />
          </Badge>
        }
        sx={secondarySx}
      />
      <BottomNavigationAction
        data-tour="stories"
        label="故事"
        icon={<AutoStoriesRoundedIcon />}
        sx={secondarySx}
      />
    </BottomNavigation>
  );
}

FixedBottomNavigation.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
