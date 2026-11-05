import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { motion } from 'motion/react';
import GameScreen from './GameScreen';
import Mizhiyin from './art/Mizhiyin';
import DiaryWheel from './art/DiaryWheel';
import { INK } from './art/palette';

// 八種 model 在手機上各長什麼樣子——「長相複本」，不是播放器本身（理由同 GameScreen）。
// 每一種只畫出「讓人一眼分得出它跟別種不一樣」的那個部件：
// 封面有大標題與開始鈕、Quiz 有選項、輸入類有輸入框、Article 是一整頁會捲的字。
// 文案取自 demo 與文件（docs/sheet/models.md），不放第五關的謎面。

const field = {
  mt: '0.7em',
  px: '0.8em',
  py: '0.55em',
  borderRadius: '0.6em',
  bgcolor: 'dialogue.field',
  color: '#263238',
  fontSize: '0.85em',
  display: 'flex',
  justifyContent: 'space-between',
};
const pill = {
  mt: '0.5em',
  px: '0.8em',
  py: '0.5em',
  borderRadius: '0.6em',
  border: '1px solid rgba(255,255,255,.45)',
  fontSize: '0.82em',
  textAlign: 'center',
};
const cta = {
  display: 'inline-block',
  mt: '1em',
  px: '1.4em',
  py: '0.5em',
  borderRadius: 99,
  bgcolor: '#fff',
  color: '#263238',
  fontWeight: 800,
  fontSize: '0.85em',
};

const Full = ({ children, bg = INK.ink, sx }) => (
  <Box
    sx={{
      position: 'absolute',
      inset: 0,
      bgcolor: bg,
      color: '#fff',
      fontSize: '5.6cqw',
      fontFamily: '"Noto Sans TC", sans-serif',
      ...sx,
    }}
  >
    {children}
  </Box>
);
Full.propTypes = { children: PropTypes.node, bg: PropTypes.string, sx: PropTypes.object };

const GameStart = () => (
  <Full>
    <Box sx={{ position: 'absolute', inset: 0 }}>
      <Mizhiyin />
    </Box>
    <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', background: `linear-gradient(transparent, ${INK.ink} 45%)` }} />
    <Box sx={{ position: 'absolute', left: '8%', right: '8%', bottom: '10%' }}>
      <Typography sx={{ fontSize: '0.75em', opacity: 0.7, fontFamily: 'inherit' }}>30 分鐘・demo</Typography>
      <Typography sx={{ fontSize: '1.5em', fontWeight: 900, lineHeight: 1.3, mt: '0.2em', fontFamily: 'inherit' }}>
        MiSheng 的
        <br />
        多列宇宙
      </Typography>
      <Box sx={cta}>開始遊戲</Box>
    </Box>
  </Full>
);

const MissionStart = () => (
  <Full bg={INK.mid}>
    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: '10%' }}>
      <Typography sx={{ fontSize: '0.8em', letterSpacing: '0.3em', opacity: 0.8, fontFamily: 'inherit' }}>第一章</Typography>
      <Typography sx={{ fontSize: '1.6em', fontWeight: 900, mt: '0.3em', fontFamily: 'inherit' }}>旁白的字謎</Typography>
      <Box sx={{ height: 3, width: '3em', bgcolor: INK.rustLight, mt: '0.8em' }} />
      <Box>
        <Box sx={cta}>開始這一關</Box>
      </Box>
    </Box>
  </Full>
);

const Img = () => (
  <Full>
    <Box sx={{ position: 'absolute', left: '8%', right: '8%', top: '18%' }}>
      <DiaryWheel />
    </Box>
    <Box sx={{ position: 'absolute', left: '8%', right: '8%', bottom: '10%' }}>
      <Typography sx={{ fontWeight: 700, fontFamily: 'inherit' }}>前任智者的日記</Typography>
      <Typography sx={{ fontSize: '0.75em', opacity: 0.7, mt: '0.3em', fontFamily: 'inherit' }}>點一下可以放大</Typography>
    </Box>
  </Full>
);

// 跟 demo 劇情無關的導覽範例：首頁不替 demo 發明它沒有的設定
const ARTICLE = [
  '老街導覽',
  '這條街在清代是碼頭邊的米市。',
  '左手邊第三間的門楣上，',
  '還留著當年商號的木匾。',
  '匾上的字少了一筆，',
  '據說是師傅故意的。',
  '找到它之後，',
  '數一數門口有幾級台階，',
  '那就是下一關的密碼。',
];

// Article：一整頁可以捲的長文，用「自己慢慢往上捲」表現
const Article = () => (
  <Full bg={INK.paper} sx={{ color: INK.ink, overflow: 'hidden' }}>
    <motion.div
      animate={{ y: ['0%', '-38%', '0%'] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      style={{ padding: '22% 9% 0' }}
    >
      {ARTICLE.map((line, i) => (
        <Typography
          key={line}
          sx={{
            fontFamily: 'inherit',
            fontWeight: i === 0 ? 900 : 400,
            fontSize: i === 0 ? '1.25em' : '0.85em',
            lineHeight: 2,
            mb: i === 0 ? '0.6em' : 0,
          }}
        >
          {line}
        </Typography>
      ))}
    </motion.div>
  </Full>
);

const SCREENS = {
  GameStart: () => <GameStart />,
  Talk: () => <GameScreen img="mizhiyin.jpg" speaker="謎之音" text="你醒啦！" />,
  Quiz: () => (
    <GameScreen img="pangbai-s.jpg" speaker="旁白" text="你想聽白話版的，還是遊戲體驗版的？">
      <Box sx={pill}>白話版</Box>
      <Box sx={pill}>遊戲體驗版</Box>
    </GameScreen>
  ),
  CustomValueInput: () => (
    <GameScreen img="mizhiyin.jpg" speaker="謎之音" text="你要取什麼酷酷的名字呢？">
      <Box sx={field}>
        <span>小白</span>
        <Box component="span" sx={{ color: 'dialogue.onField', fontWeight: 700 }}>
          送出
        </Box>
      </Box>
    </GameScreen>
  ),
  MissionStart: () => <MissionStart />,
  MissionAnswerInput: () => (
    <GameScreen img="pangbai-s.jpg" speaker="第一章" text="旁白的字謎：一口咬掉牛尾巴，猜一個字。">
      <Box sx={field}>
        <Box component="span" sx={{ opacity: 0.45 }}>
          輸入答案
        </Box>
        <Box component="span" sx={{ color: 'dialogue.onField', fontWeight: 700 }}>
          送出
        </Box>
      </Box>
    </GameScreen>
  ),
  Img: () => <Img />,
  Article: () => <Article />,
};

// 依 model 名稱畫出對應的手機畫面
const ModelScreen = ({ model }) => {
  const Screen = SCREENS[model];
  return Screen ? <Screen /> : null;
};
ModelScreen.propTypes = { model: PropTypes.string.isRequired };

export default ModelScreen;
