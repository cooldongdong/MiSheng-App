import { Box } from '@mui/material';

function GradientLayer() {
  return (
    <Box
      sx={{
        background: 'linear-gradient(transparent 12%, #37474F 66%)',
        width: '100%',
        height: '80%',
        bottom: '0%',
        position: 'absolute',
      }}
    ></Box>
  );
}

export default GradientLayer;