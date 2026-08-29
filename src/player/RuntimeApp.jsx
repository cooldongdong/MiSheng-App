import { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import GameShell from './component/GameShell';
import ColorSchemeToggle from '../shared/ColorSchemeToggle';
import { loadRuntimeGameData, runtimeImgBase } from './game/runtimeGame';

// 獨立播放器：使用者自己部署的那一份。
//
// 跟 App.jsx（/demo）的差別只有一個——資料從哪來。
//   App.jsx        build 時就把 src/gameFile/ 打包進去了
//   這裡           開機之後才去讀同目錄的 game/
// 遊戲本身、存檔、道具、提示全部共用同一套，沒有第二份實作。
//
// 沒有 previewMode：這是玩家真的在玩，進度要存進 localStorage。
const RuntimeApp = () => {
  const [gameData, setGameData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadRuntimeGameData()
      .then((data) => alive && setGameData(data))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  // 讀不到資料時要講人話。
  //
  // 不講的話玩家看到的是一個永遠轉不完的圈——而這條路最常見的兩種失敗
  //（用 file:// 開、少放一張表）都是部署的人自己看一眼就能修的。
  // 訊息寫給「把資料夾丟上去的那個人」，不是寫給工程師。
  if (error) {
    return (
      <Box
        sx={{
          // fixed + inset 而不是 minHeight:100dvh：index.css 給 body 的是
          // `display:flex; place-items:center`，一般的區塊會被縮成內容寬，
          // 於是「置中」變成在一個窄盒子裡置中，看起來就是靠左上（實測過）。
          // 脫離文件流就不必跟那份 CSS 對打——遊戲畫面本來也是這樣處理的。
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 3,
          gap: 2,
        }}
      >
        <Typography variant="h6">這個遊戲讀不起來</Typography>
        <Typography sx={{ color: 'text.secondary', maxWidth: 460, lineHeight: 1.9 }}>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          再試一次
        </Button>
      </Box>
    );
  }

  return (
    <GameShell
      gameData={gameData}
      imgBase={runtimeImgBase()}
      headerActions={<ColorSchemeToggle />}
    />
  );
};

export default RuntimeApp;
