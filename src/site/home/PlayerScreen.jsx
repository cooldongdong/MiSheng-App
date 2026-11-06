import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Divider,
  Fab,
  FilledInput,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import HomeRepairServiceRoundedIcon from "@mui/icons-material/HomeRepairServiceRounded";
import QuestionAnswerRoundedIcon from "@mui/icons-material/QuestionAnswerRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import AutoStoriesRoundedIcon from "@mui/icons-material/AutoStoriesRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonPinCircleRoundedIcon from "@mui/icons-material/PersonPinCircleRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import { ART_BY_IMG } from "./art";
import { STRAIGHT } from "./demoImages";

// 首頁每一支手機裡的遊戲畫面。**照播放器的真元件抄**，只有圖換成疊紙插畫。
//
// Dong 的判準（2026-11）：「除了背景圖是插畫風，其他的部分應該要盡可能貼近實體產品」，
// 否則使用者點進 /demo 會覺得跟官網講的不一樣；但也「只要外觀像就好」，
// 左上品牌、右上選單這些跟「這一頁長什麼樣」無關的東西不放。
//
// **為什麼是抄，不是直接 import 播放器。** 試過：直接跑真的 model 元件可以動，
// 但 eslint 的分層規則禁止 site 依賴 player（官網不該把遊戲引擎拖進 bundle），
// 實測首頁 JS 會多 41KB gzip。真元件本身幾乎都是 MUI 元件加幾行 sx，
// 抄過來的成本低，所以選這條。代價是播放器改版面時這裡不會自己跟上——
// 每個區塊都註明抄自哪個檔，改那邊時回來看一眼。
//
// **尺寸照真的手機排，再整個縮小。** 播放器的字級、間距都是寫死的 px／rem，
// 直接塞進 260px 寬的手機框會變成大字報；所以內容先用 390px（iPhone 的 CSS 寬度）
// 排好，再用 transform 縮進框裡，比例就跟真的手機一模一樣。

const BASE_W = 390;
const STATUS_BAR = 50; // 瀏覽器的可視範圍從動態島底下開始
const NAV_HEIGHT = 56; // player/component/common/layout.js
// player 的字體（shared/theme.js）。首頁的 theme 換成了 Noto Sans TC，這裡要換回來才像
const PLAYER_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans TC", sans-serif';
const SERIF = "'Noto Serif TC', serif";
const TYPE_SPEED_MS = 50; // player/component/common/TalkText.jsx

// ── 打字機：跟 TalkText 同一個速度 ───────────────────────────
const useTypewriter = (text, enabled) => {
  const reduce = useReducedMotion();
  const on = enabled && !reduce;
  const [n, setN] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on) {
      setN(text.length);
      return undefined;
    }
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
  }, [text, on]);
  return text.slice(0, n);
};

// ── 圖層：player/component/layer/* ───────────────────────────
const Layer = ({ children, sx }) => (
  <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", ...sx }}>
    {children}
  </Box>
);
Layer.propTypes = { children: PropTypes.node, sx: PropTypes.object };

const FALLBACK_BACKGROUND = "linear-gradient(160deg, #3a3a3a 0%, #202020 100%)";
// BackgroundLayer：中性深灰底＋圖片，圖片有自己的透明度
const Background = ({ Art, opacity = 0.5 }) => (
  <Layer>
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        background: FALLBACK_BACKGROUND,
        opacity,
      }}
    />
    {Art && (
      <Box sx={{ position: "absolute", inset: 0, opacity }}>
        <Art fit="cover" />
      </Box>
    )}
  </Layer>
);
Background.propTypes = {
  Art: PropTypes.elementType,
  opacity: PropTypes.number,
};

// CharacterLayer：立繪不透明。換人時跟真的一樣淡入
const Character = ({ Art, id }) => (
  <Layer>
    <motion.div
      key={id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Art />
    </motion.div>
  </Layer>
);
Character.propTypes = {
  Art: PropTypes.elementType.isRequired,
  id: PropTypes.string,
};

// GradientLayer：字底下那片漸層，色值寫死在播放器裡
const Gradient = () => (
  <Box
    sx={{
      background: "linear-gradient(transparent 12%, #37474F 66%)",
      width: "100%",
      height: "80%",
      bottom: 0,
      position: "absolute",
    }}
  />
);

// ThemeColorLayer：Talk、Quiz、輸入類的底
const Surface = ({ children }) => (
  <Box
    sx={{
      height: "100%",
      width: "100%",
      bgcolor: "dialogue.surface",
      overflow: "hidden",
      position: "relative",
    }}
  >
    {children}
  </Box>
);
Surface.propTypes = { children: PropTypes.node };

// ── 文字與按鈕：player/component/common/* ─────────────────────
const BottomBox = ({ children }) => (
  <Box
    sx={{
      width: "100%",
      p: "7%",
      boxSizing: "border-box",
      position: "absolute",
      bottom: 0,
    }}
  >
    {children}
  </Box>
);
BottomBox.propTypes = { children: PropTypes.node };

const SpeakerText = ({ speaker }) => (
  <Typography
    data-slot="speaker"
    variant="h5"
    align="left"
    sx={{ color: "#fff", width: "100%" }}
  >
    {speaker}
  </Typography>
);
SpeakerText.propTypes = { speaker: PropTypes.string };

const TalkText = ({ text, typewriter, height = "120px", textShadow }) => {
  const shown = useTypewriter(text, typewriter);
  return (
    <Typography
      data-slot="text"
      variant="body2"
      align="left"
      gutterBottom
      sx={{
        whiteSpace: "pre-wrap",
        color: "#fff",
        height,
        overflow: "hidden",
        textShadow,
      }}
    >
      {shown}
    </Typography>
  );
};
TalkText.propTypes = {
  text: PropTypes.string,
  typewriter: PropTypes.bool,
  height: PropTypes.string,
  textShadow: PropTypes.string,
};

const NextButton = ({ children = "Next" }) => (
  <Button
    variant="contained"
    size="small"
    color="inherit"
    fullWidth
    sx={{ borderRadius: "30px" }}
  >
    {children}
  </Button>
);
NextButton.propTypes = { children: PropTypes.node };

const EndIconButton = ({ children }) => (
  <Button
    variant="contained"
    size="medium"
    color="inherit"
    endIcon={<ArrowForwardRoundedIcon />}
    sx={{ borderRadius: "30px", width: "fit-content" }}
  >
    {children}
  </Button>
);
EndIconButton.propTypes = { children: PropTypes.node };

const MissionTitleText = ({ title }) => (
  <Typography
    className="serif"
    gutterBottom
    align="left"
    sx={{
      fontFamily: SERIF,
      fontWeight: 900,
      fontSize: "48px",
      lineHeight: 1.25,
      color: "#fff",
      textShadow: "0px 6px 8.4px rgba(0, 0, 0, 0.5)",
    }}
  >
    {title}
  </Typography>
);
MissionTitleText.propTypes = { title: PropTypes.string };

// 輸入框裡的字一個一個打進去（假裝玩家在打）
const useTypeIn = (text, delay) => {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce || !text) {
      setN(text.length);
      return undefined;
    }
    setN(0);
    let id;
    const start = setTimeout(() => {
      id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 250);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [text, delay, reduce]);
  return text.slice(0, n);
};

// AnswerInputForm
const AnswerInput = ({ value = "", delay = 1400 }) => {
  const typed = useTypeIn(value, delay);
  return (
    <FormControl variant="filled" fullWidth>
      <InputLabel shrink={!!typed} sx={{ color: "dialogue.onFieldMuted" }}>
        輸入答案
      </InputLabel>
      <FilledInput
        disableUnderline
        value={typed}
        readOnly
        tabIndex={-1}
        endAdornment={
          <InputAdornment
            position="end"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Divider
              orientation="vertical"
              flexItem
              sx={{ height: 28, mx: 1 }}
            />
            <IconButton
              edge="end"
              tabIndex={-1}
              sx={{ color: "dialogue.onField" }}
            >
              <SendRoundedIcon />
            </IconButton>
          </InputAdornment>
        }
        sx={{
          bgcolor: "dialogue.field",
          borderRadius: "10px",
          color: "dialogue.onFieldText",
          "&:hover, &.Mui-focused": { bgcolor: "dialogue.field" },
        }}
      />
    </FormControl>
  );
};
AnswerInput.propTypes = { value: PropTypes.string, delay: PropTypes.number };

// FloatingLayer：GameStart、MissionStart 那張白卡。高度在播放器是 calc(60dvh + 100px)
const Floating = ({ vh, children }) => (
  <Paper
    elevation={12}
    sx={{
      borderRadius: "20px",
      height: vh * 0.6 + 100,
      width: "76%",
      m: "auto",
      overflow: "hidden",
      position: "relative",
    }}
  >
    {children}
  </Paper>
);
Floating.propTypes = { vh: PropTypes.number, children: PropTypes.node };

// Img、Article 的外框：一樣高、76% 寬，Paper 佔 86%，底下一顆 NEXT
const CardColumn = ({ vh, children }) => (
  <Box
    sx={{
      height: vh * 0.6 + 100,
      width: "76%",
      m: "auto",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    {children}
    <NextButton />
  </Box>
);
CardColumn.propTypes = { vh: PropTypes.number, children: PropTypes.node };

// ZoomableImage 的置中放大鈕
const ZoomFab = () => (
  <Box
    sx={{
      position: "absolute",
      width: "100%",
      bottom: 10,
      display: "flex",
      zIndex: 2,
    }}
  >
    <Fab
      size="medium"
      tabIndex={-1}
      sx={{
        bgcolor: "#fff",
        color: "#37474F",
        m: "auto",
        top: 10,
        transform: "translateY(50%)",
      }}
    >
      <OpenInFullRoundedIcon />
    </Fab>
  </Box>
);

// ── 八種 model ──────────────────────────────────────────────

const characterArt = (speaker) => ART_BY_IMG[STRAIGHT[speaker]];

// Talk、Quiz、CustomValueInput 共用：底色＋立繪＋漸層，字在下面
const Dialogue = ({ speaker, children }) => {
  const Art = characterArt(speaker);
  return (
    <Surface>
      {Art && <Character Art={Art} id={speaker} />}
      <Gradient />
      <Layer>
        <BottomBox>{children}</BottomBox>
      </Layer>
    </Surface>
  );
};
Dialogue.propTypes = { speaker: PropTypes.string, children: PropTypes.node };

// ── 導覽列的四個分頁：player/component/page/* ─────────────────
// PageContainer＋PageTitleText＋ContentList 三件組，四頁共用
const TabPage = ({ title, children }) => (
  <Box
    sx={{
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      p: "12%",
      pb: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}
  >
    <Typography
      className="serif"
      gutterBottom
      align="left"
      sx={{
        fontFamily: SERIF,
        fontWeight: 900,
        fontSize: "48px",
        color: "text.primary",
      }}
    >
      {title}
    </Typography>
    <Stack
      spacing={2}
      sx={{ flex: 1, p: "8%", pb: "13%", m: "-8%", mt: "-3%" }}
    >
      {children}
    </Stack>
  </Box>
);
TabPage.propTypes = { title: PropTypes.string, children: PropTypes.node };

// common/MissionItem.jsx：有狀態的關卡亮、有背景圖；還沒開的是一條灰的
const MissionItem = ({ title, status, active, Art }) => (
  <Paper
    elevation={status ? 8 : 0}
    sx={{
      display: "flex",
      borderRadius: "20px",
      position: "relative",
      overflow: "hidden",
      height: 70,
      minHeight: 70,
    }}
  >
    {status ? (
      <Background Art={Art} />
    ) : (
      <Layer>
        <Box
          sx={{
            width: "100%",
            height: "100%",
            background: "#37474F",
            opacity: 0.5,
          }}
        />
      </Layer>
    )}
    {status && (
      <Layer>
        <Box
          sx={{
            background: "linear-gradient(-90deg,transparent 0%, #37474F 90%)",
            width: "70%",
            height: "100%",
          }}
        />
      </Layer>
    )}
    <Layer
      sx={{
        display: "flex",
        alignItems: "center",
        pl: "20px",
        pr: "20px",
        color: "#fff",
        opacity: active ? 1 : 0.5,
      }}
    >
      {active ? (
        <PersonPinCircleRoundedIcon />
      ) : status === "complete" ? (
        <CheckCircleOutlineRoundedIcon />
      ) : (
        <BlockRoundedIcon />
      )}
      <Typography
        className="serif"
        align="left"
        sx={{
          fontFamily: SERIF,
          fontWeight: 600,
          fontSize: "24px",
          color: "#fff",
          ml: "6px",
          flex: 1,
        }}
      >
        {title}
      </Typography>
      <ArrowForwardRoundedIcon
        sx={{ filter: "drop-shadow(2px 2px 5px rgba(0, 0, 0, 0.3))" }}
      />
    </Layer>
  </Paper>
);
MissionItem.propTypes = {
  title: PropTypes.string,
  status: PropTypes.string,
  active: PropTypes.bool,
  Art: PropTypes.elementType,
};

// common/ZoomableImage.jsx（zoomInFab='right'）：圖＋左下標題籤＋右下放大鈕
const ZoomCard = ({ Art, title, height = 220 }) => (
  <Paper
    elevation={10}
    sx={{
      display: "flex",
      borderRadius: "10px",
      position: "relative",
      overflow: "hidden",
      height,
      minHeight: height,
    }}
  >
    <Box sx={{ position: "absolute", inset: 0 }}>
      <Art fit="cover" />
    </Box>
    <Box
      sx={{
        position: "absolute",
        width: "100%",
        bottom: 10,
        display: "flex",
        alignItems: "center",
        zIndex: 1,
      }}
    >
      {title && (
        <Box
          sx={{
            backgroundColor: "#37474F",
            borderRadius: "0px 20px 20px 0px",
            fontSize: 14,
            letterSpacing: 0.7,
            color: "#fff",
            p: "6px",
            pr: "13px",
            fontFamily: PLAYER_FONT,
          }}
        >
          {title}
        </Box>
      )}
      <Fab
        size="small"
        tabIndex={-1}
        sx={{
          backgroundColor: "#fff",
          color: "#37474F",
          right: 10,
          ml: "auto",
          "&:hover": { backgroundColor: "#fff" },
        }}
      >
        <OpenInFullRoundedIcon />
      </Fab>
    </Box>
  </Paper>
);
ZoomCard.propTypes = {
  Art: PropTypes.elementType,
  title: PropTypes.string,
  height: PropTypes.number,
};

// common/HintAccordion.jsx＋HintContent.jsx＋LockedHintButton.jsx。
// 鎖著的那則：MUI Accordion 把第一個子元素當標題列，所以真的播放器上只看得到那顆解鎖鈕
const HintItem = ({ n, hint }) =>
  hint.locked ? (
    <Accordion
      disabled
      elevation={6}
      expanded={false}
      sx={{ borderRadius: "4px", "&:before": { display: "none" } }}
    >
      <Box sx={{ width: "100%" }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          tabIndex={-1}
          startIcon={<LockRoundedIcon />}
        >
          {hint.minutes
            ? `${hint.minutes} 分鐘後自動解鎖提示 ${n}`
            : `解鎖提示 ${n}`}
        </Button>
      </Box>
      <AccordionSummary>提示 {n}</AccordionSummary>
    </Accordion>
  ) : (
    <Accordion
      elevation={6}
      expanded
      sx={{ borderRadius: "4px", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} tabIndex={-1}>
        <Typography>提示 {n}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex" }}>
          <Avatar sx={{ mr: "8px" }}>{hint.speaker.slice(0, 1)}</Avatar>
          <Stack spacing={1}>
            <Typography
              variant="body1"
              align="left"
              sx={{ height: "40px", lineHeight: "40px", fontWeight: "bold" }}
            >
              {hint.speaker}
            </Typography>
            <Typography align="left">{hint.text}</Typography>
          </Stack>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
HintItem.propTypes = { n: PropTypes.number, hint: PropTypes.object };

// propTypes 在下面用 forEach 一次掛給八個（它們吃同一組 props），lint 看不出來
/* eslint-disable react/prop-types */
const MODELS = {
  // TalkModel → TalkBox
  Talk: ({ page, typewriter }) => (
    <Dialogue speaker={page.speaker}>
      <Stack spacing={2}>
        <SpeakerText speaker={page.speaker} />
        <TalkText text={page.text} typewriter={typewriter} />
        <NextButton />
      </Stack>
    </Dialogue>
  ),
  // QuizModel → QuestionBox：選項各是一顆 NextButton
  Quiz: ({ page, typewriter }) => (
    <Dialogue speaker={page.speaker}>
      <Stack spacing={2}>
        <SpeakerText speaker={page.speaker} />
        <TalkText text={page.text} typewriter={typewriter} />
        {(page.options || []).map((o) => (
          <NextButton key={o}>{o}</NextButton>
        ))}
      </Stack>
    </Dialogue>
  ),
  // CustomValueInputModel
  CustomValueInput: ({ page, typewriter }) => (
    <Dialogue speaker={page.speaker}>
      <Stack spacing={2}>
        <SpeakerText speaker={page.speaker} />
        <TalkText text={page.text} typewriter={typewriter} />
      </Stack>
      <AnswerInput value={page.input} />
    </Dialogue>
  ),
  // GameStartModel：白卡＋封面圖＋大標＋開始遊戲
  GameStart: ({ page, vh }) => (
    <Floating vh={vh}>
      <Background Art={page.art} opacity={0.9} />
      <Box
        sx={{
          width: "100%",
          p: "7%",
          boxSizing: "border-box",
          position: "absolute",
          bottom: 0,
        }}
      >
        <MissionTitleText title={page.title} />
        <Stack direction="row" spacing={2} sx={{ mt: "10px" }}>
          <EndIconButton>開始遊戲</EndIconButton>
        </Stack>
      </Box>
    </Floating>
  ),
  // MissionStartModel：同一張白卡，多一段說明
  MissionStart: ({ page, vh }) => (
    <Floating vh={vh}>
      <Background Art={page.art} opacity={0.9} />
      <Box
        sx={{
          width: "100%",
          p: "7%",
          boxSizing: "border-box",
          position: "absolute",
          bottom: 0,
        }}
      >
        <MissionTitleText title={page.title} />
        {page.description && (
          <TalkText
            text={page.description}
            height="auto"
            textShadow="0px 3px 6px rgba(0, 0, 0, 0.5)"
          />
        )}
        <Stack direction="row" spacing={2} sx={{ mt: "10px" }}>
          <EndIconButton>開始遊戲</EndIconButton>
        </Stack>
      </Box>
    </Floating>
  ),
  // MissionAnswerInputModel：滿版背景（0.9）＋大標＋輸入框
  MissionAnswerInput: ({ page }) => (
    <Surface>
      <Background Art={page.art} opacity={0.9} />
      <Layer>
        <BottomBox>
          <MissionTitleText title={page.title} />
          <AnswerInput value={page.input} delay={1800} />
        </BottomBox>
      </Layer>
    </Surface>
  ),
  // ImgModel → ZoomableImage（zoomInFab='center'）
  Img: ({ page, vh }) => (
    <CardColumn vh={vh}>
      <Paper
        elevation={10}
        sx={{
          borderRadius: "20px",
          position: "relative",
          height: "86%",
          width: "100%",
          overflow: "visible",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            overflow: "hidden",
            bgcolor: "dialogue.surface",
          }}
        >
          {page.art && <page.art fit="contain" />}
        </Box>
        <ZoomFab />
      </Paper>
    </CardColumn>
  ),
  // ArticleModel：一張可以捲的卡。首頁用「自己慢慢往上捲」表現它會捲
  Article: ({ page, vh }) => (
    <CardColumn vh={vh}>
      <Paper
        elevation={10}
        sx={{
          height: "86%",
          width: "100%",
          borderRadius: "20px",
          backgroundImage: "none",
          border: 1,
          borderColor: "divider",
          position: "relative",
          overflow: "visible",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius: "inherit",
          }}
        >
          <motion.div
            animate={{ y: [0, 0, -140, -140, 0] }}
            transition={{
              duration: 10,
              repeat: Infinity,
              times: [0, 0.2, 0.55, 0.85, 1],
              ease: "easeInOut",
            }}
            style={{ padding: "7%" }}
          >
            {page.title && (
              <Typography
                variant="h6"
                align="left"
                sx={{ fontWeight: 700, mb: 1.5, color: "text.primary" }}
              >
                {page.title}
              </Typography>
            )}
            {(page.body || []).map((b) =>
              b.h ? (
                <Typography
                  key={b.h}
                  component="h3"
                  sx={{
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    lineHeight: 1.5,
                    mt: 3.5,
                    mb: 0.75,
                  }}
                >
                  {b.h}
                </Typography>
              ) : (
                <Typography
                  key={b}
                  variant="body2"
                  sx={{ lineHeight: 1.9, mb: 1.5 }}
                >
                  {b}
                </Typography>
              ),
            )}
          </motion.div>
        </Box>
        <ZoomFab />
      </Paper>
    </CardColumn>
  ),
  // ── 導覽列的四頁（不是 model，借同一個表擺，PlayerScreen 一視同仁）──
  MissionPage: ({ page }) => (
    <TabPage title="關卡">
      {page.missions.map((m) => (
        <MissionItem key={m.title} {...m} />
      ))}
    </TabPage>
  ),
  PropPage: ({ page }) => (
    <TabPage title="道具">
      {page.props.map((p) => (
        <ZoomCard key={p.title} {...p} />
      ))}
    </TabPage>
  ),
  HintPage: ({ page }) => (
    <TabPage title="提示">
      {page.hints.map((h, n) => (
        <HintItem key={n} n={n + 1} hint={h} />
      ))}
    </TabPage>
  ),
  StoryPage: ({ page }) => (
    <TabPage title="故事">
      {page.stories.map((p) => (
        <ZoomCard key={p.title} {...p} height={260} />
      ))}
    </TabPage>
  ),
};
Object.values(MODELS).forEach((M) => {
  M.propTypes = {
    page: PropTypes.object,
    typewriter: PropTypes.bool,
    vh: PropTypes.number,
  };
});
/* eslint-enable react/prop-types */

// ── 導覽列：player/component/BottomNavigation.jsx ─────────────
const primarySx = {
  color: "text.disabled",
  "& .MuiSvgIcon-root": {
    fontSize: 26,
    color: "secondary.contrastText",
    bgcolor: "secondary.main",
    borderRadius: "50%",
    p: "10px",
    boxSizing: "content-box",
    mt: "-15px",
    mb: "2px",
  },
};
const secondarySx = { color: "text.disabled" };

// 哪一頁亮：導覽列的五顆照順序是 關卡／道具／解謎／提示／故事
const NAV_OF = { MissionPage: 0, PropPage: 1, HintPage: 3, StoryPage: 4 };
const NAV_ITEMS = [
  { label: "關卡", Icon: StorageRoundedIcon },
  { label: "道具", Icon: HomeRepairServiceRoundedIcon },
  { label: "解謎", Icon: QuestionAnswerRoundedIcon, primary: true },
  { label: "提示", Icon: TipsAndUpdatesRoundedIcon },
  { label: "故事", Icon: AutoStoriesRoundedIcon },
];

// onNav 有給＝這支手機的導覽列真的能按（導覽列那一段）；沒給就只是長相，不搶 tab 焦點
const NavBar = ({ value, onNav, badge = 0 }) => (
  <BottomNavigation
    value={value}
    onChange={onNav ? (e, v) => onNav(v) : undefined}
    showLabels
    sx={{
      width: "100%",
      bgcolor: "game.nav",
      boxShadow: "0 -1px 5px rgba(0, 0, 0, 0.1)",
      overflow: "visible",
    }}
  >
    {NAV_ITEMS.map(({ label, Icon, primary }) => (
      <BottomNavigationAction
        key={label}
        tabIndex={onNav ? 0 : -1}
        label={label}
        icon={
          label === "提示" ? (
            <Badge badgeContent={badge} color="error">
              <Icon />
            </Badge>
          ) : (
            <Icon />
          )
        }
        sx={primary ? primarySx : secondarySx}
      />
    ))}
  </BottomNavigation>
);
NavBar.propTypes = {
  value: PropTypes.number,
  onNav: PropTypes.func,
  badge: PropTypes.number,
};

// ── 外殼 ────────────────────────────────────────────────────

// 量手機螢幕的實際大小，算出縮放比例
const useBox = () => {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
};

/**
 * page：這一頁要畫什麼。共同欄位 model；其他依 model：
 *   Talk／Quiz／CustomValueInput  speaker, text, options（Quiz）, input（輸入框裡打的字）
 *   GameStart／MissionStart        title, description, art（插畫元件）
 *   MissionAnswerInput             title, art, input
 *   Img                            art
 *   Article                        title, body（字串＝一段；{ h } ＝小標）
 *   MissionPage／PropPage／HintPage／StoryPage  導覽列的四頁：missions／props／hints／stories
 *   badge：導覽列「提示」上的紅點數字
 * onNav：給了導覽列就能按，回傳第幾顆（0–4）
 * children：疊在整個畫面最上面（不跟著縮放），例如「改一格看看」的擋下來遮罩
 */
const FULL_BLEED = new Set([
  "Talk",
  "Quiz",
  "CustomValueInput",
  "MissionAnswerInput",
]);

const PlayerScreen = ({ page, typewriter = true, onNav, children }) => {
  const [ref, { w, h }] = useBox();
  const s = w / BASE_W;
  const H = s ? h / s : 0;
  const vh = H - STATUS_BAR; // 瀏覽器的可視高度：dvh 的基準
  const Model = MODELS[page.model];
  // 滿版的那幾種（底是立繪或背景圖）讓圖一路鋪到狀態列底下，不露出 game.bg 那條底色。
  // 卡片型（封面、關卡開場、Img、Article）卡片外本來就是底色，跟真的一樣，不動
  const bleed = FULL_BLEED.has(page.model) ? STATUS_BAR : 0;

  return (
    <Box
      ref={ref}
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        bgcolor: "game.bg",
      }}
    >
      {s > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: BASE_W,
            height: H,
            transform: `scale(${s})`,
            transformOrigin: "0 0",
            fontSize: 16,
            // 播放器的字體。大標用襯線（className="serif"）的那幾個除外
            "& .MuiTypography-root:not(.serif), & .MuiButtonBase-root, & .MuiInputBase-root, & .MuiFormLabel-root, & .MuiBottomNavigationAction-label":
              { fontFamily: PLAYER_FONT },
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: STATUS_BAR,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {/* 遊戲區：導覽列以上，內容垂直置中（GameShell 的 #main-container） */}
            <Box
              sx={{
                position: "absolute",
                top: -bleed,
                left: 0,
                width: "100%",
                height: `calc(100% - ${NAV_HEIGHT - bleed}px)`,
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              {/* 換畫面時只有這一塊淡入淡出；導覽列在外面，不跟著重畫 */}
              <AnimatePresence initial={false}>
                {Model && (
                  <motion.div
                    key={page.model}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Model page={page} vh={vh} typewriter={typewriter} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
            <Box
              sx={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: "100%",
                zIndex: 2,
              }}
            >
              <NavBar
                value={NAV_OF[page.model] ?? 2}
                onNav={onNav}
                badge={page.badge}
              />
            </Box>
          </Box>
        </Box>
      )}
      {children}
    </Box>
  );
};

PlayerScreen.propTypes = {
  page: PropTypes.shape({
    model: PropTypes.string.isRequired,
    badge: PropTypes.number,
  }).isRequired,
  typewriter: PropTypes.bool,
  onNav: PropTypes.func,
  children: PropTypes.node,
};

export default PlayerScreen;
