import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockedHintButton from './LockedHintButton';
import HintContent from '../common/HintContent';
import PropTypes from 'prop-types';

const HintAccordion = ({
  index,
  hint,
  isUnlocked,
  isExpanded,
  onExpand,
  onUnlock,
  remainingMinutes,
  fullScreenIndex,
  onToggleFullScreen,
}) => {
  // expanded 要再 && 一次 isUnlocked，不能只靠 disabled。
  //
  // MUI 的 disabled 只讓摘要列變灰、擋掉點擊，**擋不住 expanded**——那是受控
  // prop，它贏。所以「鎖著但 expanded 是 true」的組合會照樣把 AccordionDetails
  // 連同提示內容整個畫出來，而畫面上同時還蓋著一顆「解鎖提示 N」的按鈕。
  //
  // 這不是假想的：/create 三欄畫面點流程圖跳關時，中間欄的分頁不會切換，
  // HintPage 於是不卸載，上一關留下的展開狀態就套到了新的一關上（Dong 2026-09-01 回報）。
  // 呼叫端已經修好了，但這一行讓「鎖著卻看得到內容」在結構上不可能發生——
  // 不管下一個人怎麼算 isExpanded。
  return (
    <Accordion
      key={index}
      disabled={!isUnlocked}
      elevation={6}
      expanded={isExpanded && isUnlocked}
      onChange={() => onExpand(index)}
      sx={{
        borderRadius: '4px',
        '&:before': {
          display: 'none', // 移除內建分隔線
        },
      }}
    >
      {!isUnlocked && (
        <LockedHintButton
          index={index}
          onUnlock={onUnlock}
          remainingMinutes={remainingMinutes}
        />
      )}
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>提示 {index + 1}</Typography>
      </AccordionSummary>
      {/* 鎖著就不要把內容畫出來。收起來的 AccordionDetails 仍然在 DOM 裡，
          玩家「檢查元素」就讀得到——對一個解謎遊戲來說，那跟直接顯示差不多。
          （提示文字本來就在 bundle 或 CSV 裡，這擋不住真的想挖的人，但沒有理由
          把它放在右鍵兩下就看得到的地方。） */}
      <AccordionDetails>
        {isUnlocked && (
          <HintContent
            hint={hint}
            index={index}
            fullScreenIndex={fullScreenIndex}
            onToggleFullScreen={onToggleFullScreen}
          />
        )}
      </AccordionDetails>
    </Accordion>
  );
};

HintAccordion.propTypes = {
  remainingMinutes: PropTypes.number,
  index: PropTypes.number.isRequired,
  hint: PropTypes.shape({
    speaker: PropTypes.string,
    avatar: PropTypes.string,
    text: PropTypes.string.isRequired,
    img: PropTypes.string,
  }).isRequired,
  isUnlocked: PropTypes.bool.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onExpand: PropTypes.func.isRequired,
  onUnlock: PropTypes.func.isRequired,
  fullScreenIndex: PropTypes.number,
  onToggleFullScreen: PropTypes.func.isRequired,
};

export default HintAccordion;
