import { Typography } from '@mui/material';
import PropTypes from 'prop-types';

const PageTitleText = ({ title }) => (
  <Typography
    gutterBottom
    align="left"
    sx={{
      fontFamily: "'Noto Serif TC', serif",
      fontWeight: 900,
      fontSize: '48px',
      color: 'text.primary',
    }}
  >
    {title}
  </Typography>
);

PageTitleText.propTypes = {
  title: PropTypes.string.isRequired,
};

export default PageTitleText;
