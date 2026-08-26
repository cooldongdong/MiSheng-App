import {
  Divider,
  FilledInput,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  InputAdornment,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PropTypes from 'prop-types';

const AnswerInputForm = ({
  value,
  onChange,
  onClick,
  disabled,
  giveupCountdown = null,
}) => {
  return (
    <FormControl variant="filled" fullWidth>
      <InputLabel htmlFor="mission-answer">輸入答案</InputLabel>
      <FilledInput
        id="mission-answer"
        type="text"
        // filled 變體自帶一條底線。這裡已經把它改成白底圓角的樣子，那條線就變成
        // 圓角框下面多出來的一槓——關掉才是完整的那個造型。
        disableUnderline
        value={value}
        onChange={onChange}
        endAdornment={
          <InputAdornment
            position="end"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                height: 28,
                mx: 1,
              }}
            />
            <IconButton
              onClick={onClick}
              edge="end"
              aria-label="submit-answer"
              sx={{
                // 這顆坐的是**輸入框的白底**，不是底下那層深墨。所以它要用對白底成立的
                // 固定色（見 palette.dialogue 的註解）——沒有顏色的話，使用者根本不知道
                // 那裡有一顆可以按的東西。
                color: 'dialogue.onField',
                '&:hover': {
                  color: 'dialogue.onFieldHover',
                  backgroundColor: 'rgba(0, 0, 0, 0.06)',
                },
              }}
            >
              <SendRoundedIcon />
            </IconButton>
          </InputAdornment>
        }
        disabled={disabled}
        sx={{
          backgroundColor: 'dialogue.field',
          borderRadius: '10px',
          '&:hover': { backgroundColor: 'dialogue.field' },
          '&.Mui-focused': { backgroundColor: 'dialogue.field' },
          '&:focus-within': { backgroundColor: 'dialogue.field' },
        }}
      />
      {giveupCountdown === 0 && (
        <FormHelperText sx={{ color: 'dialogue.onSurface' }}>
          如果要放棄作答，請輸入『我放棄了』!
        </FormHelperText>
      )}
    </FormControl>
  );
};

AnswerInputForm.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  giveupCountdown: PropTypes.number,
};

export default AnswerInputForm;
