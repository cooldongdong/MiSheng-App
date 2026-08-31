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
}) => {
  return (
    <Accordion
      key={index}
      disabled={!isUnlocked}
      elevation={6}
      expanded={isExpanded}
      onChange={() => onExpand(index)}
      sx={{
        borderRadius: '4px',
        '&:before': {
          display: 'none', // 移除內建分隔線
        },
      }}
    >
      {!isUnlocked && <LockedHintButton index={index} onUnlock={onUnlock} />}
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>提示 {index + 1}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <HintContent hint={hint} index={index} />
      </AccordionDetails>
    </Accordion>
  );
};

HintAccordion.propTypes = {
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
};

export default HintAccordion;
