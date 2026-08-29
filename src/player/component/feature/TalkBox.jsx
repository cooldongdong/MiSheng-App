import { useState } from 'react';
import { Box, Stack, IconButton } from '@mui/material';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import BottomBox from '../common/BottomBox';
import SpeakerText from '../common/SpeakerText';
import TalkText from '../common/TalkText';
import NextButton from '../common/NextButton';
import FullTextDialog from '../common/FullTextDialog';
import PropTypes from 'prop-types';

const TalkBox = ({
  title,
  text,
  fullText,
  textContainerRef,
  onNext,
  canProceed,
  showIcon,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <BottomBox>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <SpeakerText speaker={title} />
          {/* 「全文顯示」按鈕 */}
          {showIcon && (
            <IconButton
              size="small"
              onClick={() => setOpen(true)}
              sx={{ color: '#fff', opacity: '0.5' }}
            >
              <FullscreenRoundedIcon />
            </IconButton>
          )}
        </Box>
        <TalkText text={text} ref={textContainerRef} />
        {canProceed && <NextButton onClick={onNext}>Next</NextButton>}
      </Stack>

      {/* 彈出視窗 */}
      <FullTextDialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        text={fullText}
      />
    </BottomBox>
  );
};

TalkBox.propTypes = {
  title: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  fullText: PropTypes.string,
  textContainerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  onNext: PropTypes.func.isRequired,
  canProceed: PropTypes.bool.isRequired,
  showIcon: PropTypes.bool,
};

export default TalkBox;
