import { Button } from '@mui/material';
import PropTypes from 'prop-types';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

const EndIconButton = ({
  onClick,
  disabled = false,
  children,
  endIcon = null,
  href = null,
}) => {
  return (
    <Button
      variant="contained"
      size="medium"
      color="inherit"
      sx={{ borderRadius: '30px', width: 'fit-content' }}
      onClick={href ? undefined : onClick}
      disabled={disabled}
      endIcon={endIcon || <ArrowForwardRoundedIcon />}
      href={href || undefined}
      target={href ? '_blank' : undefined}
      component={href ? 'a' : 'button'}
    >
      {children}
    </Button>
  );
};

EndIconButton.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
  endIcon: PropTypes.node,
  href: PropTypes.string,
};

export default EndIconButton;
