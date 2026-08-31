import { Box } from '@mui/material';
import PropTypes from 'prop-types';

const PageContainer = ({ children }) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        p: '12%',
        pb: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
};

PageContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PageContainer;
