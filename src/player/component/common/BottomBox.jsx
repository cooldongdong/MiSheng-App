import Box from '@mui/material/Box';
import PropTypes from 'prop-types';

const BottomBox = ({ children }) => {
  return (
    <Box
      sx={{
        width: '100%',
        padding: '7%',
        boxSizing: 'border-box',
        position: 'absolute',
        bottom: 0,
      }}
    >
      {children}
    </Box>
  );
};

BottomBox.propTypes = {
  children: PropTypes.node.isRequired,
};

export default BottomBox;
