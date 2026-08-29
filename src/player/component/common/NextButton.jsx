import { Button } from '@mui/material';
import PropTypes from 'prop-types';

const NextButton = ({ onClick, disabled, children, href = null }) => {
  return (
    <Button
      variant="contained"
      size="small"
      color="inherit"
      fullWidth
      sx={{ borderRadius: '30px' }}
      href={href}
      target={href ? '_blank' : undefined}
      onClick={href ? undefined : onClick}
      disabled={disabled || false}
    >
      {children}
    </Button>
  );
};

NextButton.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
  href:PropTypes.string,
};

export default NextButton;
