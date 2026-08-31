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
          key={option.id}
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
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      nextId: PropTypes.string.isRequired,
    })
  ).isRequired,
  onOptionClick: PropTypes.func.isRequired,
  showKeys: PropTypes.bool,
};

export default OptionButtons;
