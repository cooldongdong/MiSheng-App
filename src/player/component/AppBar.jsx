// import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// import { useNavigate } from 'react-router-dom';

const MyAppBar = () => {
  // const navigate = useNavigate(); // 使用 useNavigate 來控制路由

  const handleBack = () => {
    // navigate(-1); // 返回上一頁
  };

  return (
    <AppBar
      sx={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        margin: 'auto',
        backgroundColor: '#fff',
        color: '#777',
      }}
      elevation={0}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={handleBack}
          aria-label="back"
          sx={{ marginLeft: '-5px', fontSize: '2em' }}
        >
          <ArrowBackIcon fontSize="inherit" />
        </IconButton>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1 }}
        ></Typography>
      </Toolbar>
    </AppBar>
  );
};

export default MyAppBar;
