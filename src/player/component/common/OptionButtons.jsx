import { keyOf } from '../../../shared/rowKey';
import NextButton from './NextButton';
import KeyCap from './KeyCap';
import PropTypes from 'prop-types';

// showKeys：在 /create 試玩時，選項前面標上它的數字鍵。
// 標號本身就是說明——不必另外寫一行「可以按數字選」。
const OptionButtons = ({ options, onOptionClick, showKeys = false }) => (
  <>
    {options.map((option, index) => {
      return (
        <NextButton
          // 選項是「以這一列為 parentId 的那些 row」撈出來的，沒有任何人指向
          // 選項自己 ⇒ 它的 id 本來就不必填（見 shared/rowKey）。用 option.id
          // 當 key 的話，兩個都沒取名字的選項會拿到同一個 undefined，React 會接錯。
          key={keyOf(option)}
          href={option.url}
          onClick={!option.url ? () => onOptionClick(option.nextId) : undefined}
        >
          {showKeys && index < 9 && <KeyCap>{index + 1}</KeyCap>}
          {option.title}
        </NextButton>
      );
    })}
  </>
);

OptionButtons.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      title: PropTypes.string.isRequired,
      nextId: PropTypes.string,
    })
  ).isRequired,
  onOptionClick: PropTypes.func.isRequired,
  showKeys: PropTypes.bool,
};

export default OptionButtons;
