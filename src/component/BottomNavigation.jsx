import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import HomeRepairServiceRoundedIcon from '@mui/icons-material/HomeRepairServiceRounded';
import QuestionAnswerRoundedIcon from '@mui/icons-material/QuestionAnswerRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import PropTypes from 'prop-types';

export default function FixedBottomNavigation({ value, onChange }) {
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
      <BottomNavigationAction label="關卡" icon={<StorageRoundedIcon />} />
      <BottomNavigationAction
        label="道具"
        icon={<HomeRepairServiceRoundedIcon />}
      />
      <BottomNavigationAction
        label="解謎"
        icon={<QuestionAnswerRoundedIcon />}
      />
      <BottomNavigationAction
        label="提示"
        icon={<TipsAndUpdatesRoundedIcon />}
      />
      <BottomNavigationAction label="故事" icon={<AutoStoriesRoundedIcon />} />
    </BottomNavigation>
  );
}

FixedBottomNavigation.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
