import { Stack } from '@mui/material';
import BottomBox from '../common/BottomBox';
import SpeakerText from '../common/SpeakerText';
import QuestionText from '../common/QuestionText';
import OptionButtons from '../common/OptionButtons';
import PropTypes from 'prop-types';

const QuestionBox = ({
  speaker,
  text,
  typeMode,
  options,
  onOptionClick,
  showKeys = false,
}) => {
  return (
    <BottomBox>
      <Stack spacing={2}>
        <SpeakerText speaker={speaker} />
        <QuestionText text={text} typeMode={typeMode} />
        <OptionButtons
          options={options}
          onOptionClick={onOptionClick}
          showKeys={showKeys}
        />
      </Stack>
    </BottomBox>
  );
};

QuestionBox.propTypes = {
  speaker: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  typeMode: PropTypes.oneOf(['type', 'instant', 'silent']),
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

export default QuestionBox;
