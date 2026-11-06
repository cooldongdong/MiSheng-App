import { useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, Typography, useMediaQuery } from "@mui/material";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import MiniSheet from "./MiniSheet";
import { tint } from "./tint";
import PhoneFrame from "./PhoneFrame";
import PlayerScreen from "./PlayerScreen";

// 第二段：往下捲，一列一列地播。
//
// Hero 講的是「一列＝一頁」；這段要講的是**欄位就是語法**——
// model 決定這頁是什麼（對白／輸入／選擇題），speaker 換人立繪就換，
// customKey 存下來的值可以在後面用 {{ }} 叫出來，選項各自一列、parentId 指回題目。
// 內容全部取自 demo 遊戲的 rundown 表，列號照真的試算表算（表頭是第 1 列）。

const PLAYER_NAME = "小白";

const ROWS = [
  {
    rowNo: 3,
    cells: {
      model: "Talk",
      speaker: "謎之音",
      title: "",
      text: "你醒啦！",
      customKey: "",
    },
  },
  {
    rowNo: 4,
    cells: {
      model: "Talk",
      speaker: "玩家.",
      title: "",
      text: "你是誰？我在哪？",
      customKey: "",
    },
  },
  {
    rowNo: 7,
    cells: {
      model: "CustomValueInput",
      speaker: "謎之音",
      title: "",
      text: "你要取什麼酷酷的名字呢？",
      customKey: "playerName",
    },
  },
  {
    rowNo: 8,
    cells: {
      model: "Talk",
      speaker: "玩家.",
      title: "",
      text: "阿，真是抱歉，忘了自我介紹，我是{{playerName}}，請問你是？",
      customKey: "",
    },
  },
  {
    rowNo: 13,
    cells: {
      model: "Quiz",
      speaker: "旁白",
      title: "",
      text: "你想聽白話版的還是有遊戲體驗版的？",
      customKey: "",
    },
  },
  {
    rowNo: 14,
    cells: {
      model: "Quiz",
      speaker: "",
      title: "白話版",
      text: "",
      customKey: "",
    },
  },
  {
    rowNo: 15,
    cells: {
      model: "Quiz",
      speaker: "",
      title: "遊戲體驗版",
      text: "",
      customKey: "",
    },
  },
];

// 每一步：亮哪一列、手機畫什麼、旁邊說什麼、哪幾格要一起圈起來
const STEPS = [
  {
    row: 3,
    model: "Talk",
    note: "一列一句對白。speaker 寫誰在說話，立繪就自動換上。",
    mark: [],
  },
  {
    row: 4,
    model: "Talk",
    note: "換一個 speaker，畫面就換一個人。",
    mark: [[4, "speaker"]],
  },
  {
    row: 7,
    model: "CustomValueInput",
    note: "換一個 model，這一頁就變成輸入框。玩家填的值存進 customKey。",
    mark: [
      [7, "model"],
      [7, "customKey"],
    ],
  },
  {
    row: 8,
    model: "Talk",
    note: "之後的對白寫 {{playerName}}，就會換成玩家剛剛取的名字。",
    mark: [
      [7, "customKey"],
      [8, "text"],
    ],
  },
  {
    row: 13,
    model: "Quiz",
    note: "選擇題：每個選項各佔一列。選了哪個，故事就往哪裡走。",
    mark: [
      [14, "title"],
      [15, "title"],
    ],
  },
];

const ALL_COLUMNS = [
  { key: "model", width: "9.5em" },
  { key: "speaker", width: "4.6em" },
  { key: "title", width: "6em" },
  { key: "text", width: "1fr" },
  { key: "customKey", width: "6.6em" },
];
const NARROW_COLUMNS = ALL_COLUMNS.filter((c) =>
  ["model", "speaker", "text"].includes(c.key),
);

const rowOf = (n) => ROWS.find((r) => r.rowNo === n).cells;

const ScreenFor = ({ step }) => {
  const r = rowOf(step.row);
  const text = r.text.replace("{{playerName}}", PLAYER_NAME);
  // Quiz 的選項是同一張表裡 parentId 指回題目的那幾列
  const options =
    step.model === "Quiz"
      ? ROWS.filter(
          (x) =>
            x.rowNo > step.row && x.cells.model === "Quiz" && x.cells.title,
        ).map((x) => x.cells.title)
      : undefined;
  return (
    <PlayerScreen
      page={{
        model: step.model,
        speaker: r.speaker,
        text,
        options,
        input: step.model === "CustomValueInput" ? PLAYER_NAME : undefined,
      }}
    />
  );
};

ScreenFor.propTypes = { step: PropTypes.object.isRequired };

const RowToScreen = () => {
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const wide = useMediaQuery((t) => t.breakpoints.up("md"));
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(
      STEPS.length - 1,
      Math.max(0, Math.floor(p * STEPS.length)),
    );
    setI((cur) => (cur === next ? cur : next));
  });

  const step = STEPS[i];
  const marked = new Set(step.mark.map(([r, k]) => `${r}.${k}`));
  // 窄螢幕放不下整張表：只留這一步相關的列
  const related = new Set([step.row, ...step.mark.map(([r]) => r)]);
  const rows = wide ? ROWS : ROWS.filter((r) => related.has(r.rowNo));

  return (
    <Box
      ref={ref}
      component="section"
      sx={{ height: `${STEPS.length * 85 + 30}vh`, position: "relative" }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: 2,
          overflow: "hidden",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 1160, mx: "auto" }}>
          {/* 標題放進左欄、整組靠上對齊：手機上緣跟標題上緣切齊（跟「改一格」同一個構圖） */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
              gap: { xs: 2, md: 6 },
              alignItems: "start",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                component="h2"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "1.7rem", md: "2.6rem" },
                  color: "text.primary",
                  lineHeight: 1.3,
                  mb: { xs: 2, md: 5 },
                }}
              >
                一列，就是一個畫面。
              </Typography>
              <MiniSheet
                id="rts"
                columns={wide ? ALL_COLUMNS : NARROW_COLUMNS}
                rows={rows}
                active={step.row}
                cellSx={(r, key) =>
                  marked.has(`${r.rowNo}.${key}`)
                    ? {
                        outline: "2px solid",
                        outlineColor: "secondary.main",
                        outlineOffset: -2,
                        bgcolor: tint("secondary", 0.1),
                        fontWeight: 700,
                      }
                    : {}
                }
              />

              {/* 這一步在講什麼 */}
              <Box
                sx={{
                  mt: { xs: 1.5, md: 3 },
                  minHeight: { xs: 64, md: 90 },
                  position: "relative",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Box
                      component="code"
                      sx={{
                        fontSize: "0.8rem",
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: tint("secondary", 0.12),
                        color: "secondary.main",
                        fontWeight: 700,
                      }}
                    >
                      model = {step.model}
                    </Box>
                    <Typography
                      sx={{
                        mt: 1,
                        color: "text.secondary",
                        fontSize: { xs: "0.95rem", md: "1.1rem" },
                        lineHeight: 1.8,
                      }}
                    >
                      {step.note}
                    </Typography>
                  </motion.div>
                </AnimatePresence>
              </Box>

              {/* 第幾步：只寫數字，不畫進度條 */}
              <Typography
                sx={{
                  mt: 1,
                  fontSize: "0.85rem",
                  color: "text.disabled",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i + 1} / {STEPS.length}
              </Typography>
            </Box>

            <Box sx={{ justifySelf: "center" }}>
              <PhoneFrame
                width={{ xs: "min(190px, 21dvh)", md: "min(290px, 30dvh)" }}
              >
                <ScreenFor step={step} />
              </PhoneFrame>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RowToScreen;
