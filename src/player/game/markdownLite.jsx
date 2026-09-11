import { Fragment } from 'react';
import { Typography, Box } from '@mui/material';
import PropTypes from 'prop-types';

// Article 的極小 markdown 子集。**刻意不引任何 markdown 套件。**
//
// 引一整套 markdown 等於一次答應了表格、連結、圖片、內嵌 HTML（不關掉就是 XSS），
// 然後永遠在回答「為什麼我打的 # 變成大標題了」。創作者在一篇導覽解說裡真正需要的
// 只有三件事：分段、分節、強調一兩個關鍵詞。所以支援的就是這四條規則，講得完：
//
//   1. **一行就是一段**——不需要空行。試算表裡按 Alt+Enter 就是分段，
//      這是刻意偏離標準 markdown 的地方（標準要空行），因為儲存格裡的直覺是前者。
//      demo 的 rundown 早就有八格在用單一換行分段。
//   2. `## 小標`
//   3. `- 項目` 與 `1. 項目`（連續的自動併成一組）
//   4. `> 引言`（連續多行併成同一段引文）
//   5. `---` 分隔線
//   6. `**粗體**`
//
// 不支援也不打算支援的：斜體（單顆 `*` 在中文標點旁太容易誤觸）、連結、圖片、
// 表格、HTML、程式碼。要放圖請用 backgroundImg 欄位。
//
// **`1.` 的編號由瀏覽器數，不採用創作者填的數字。** 在試算表裡手動維護編號，
// 跟 2026-08-26 那個「手拉 462 個 id」是同一件事——插一行就要重編。
// 所以 `1. 1. 1.` 與 `1. 2. 3.` 畫出來一樣。
//
// **`**` 從此在 Article 的 text 裡是保留字元。** 落單的 `**` 會原樣顯示出來
// （下面的切法保證這件事），不會吃掉後面的內容——validator 之後可以再加一條
// 提醒，但播放器本身不該因為創作者少打兩顆星就壞掉。

// 行內：把 **粗體** 切出來。
// 用 split 而不是 replace，是因為要回傳 React 元素而不是字串——
// 走 dangerouslySetInnerHTML 才是把 XSS 的門打開的那條路。
const inline = (line) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    return m ? (
      <Box key={i} component="strong" sx={{ fontWeight: 700 }}>
        {m[1]}
      </Box>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });

// 把整段文字切成 block。連續的 `- ` 併成同一組，其餘一行一個。
const toBlocks = (text) => {
  const blocks = [];
  String(text ?? '')
    .split('\n')
    .forEach((raw) => {
      const line = raw.trimEnd();
      if (!line.trim()) return; // 空行只是視覺上的空白，間距由 spacing 給
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        blocks.push({ type: 'hr' });
      } else if (line.startsWith('## ')) {
        blocks.push({ type: 'h', text: line.slice(3) });
      } else if (/^>\s?/.test(line)) {
        const item = line.replace(/^>\s?/, '');
        const last = blocks[blocks.length - 1];
        // 連續的 `>` 是同一段引文，不是好幾段——碑文或耆老的話常常跨行
        if (last?.type === 'quote') last.lines.push(item);
        else blocks.push({ type: 'quote', lines: [item] });
      } else if (/^\d+[.)]\s+/.test(line)) {
        const item = line.replace(/^\d+[.)]\s+/, '');
        const last = blocks[blocks.length - 1];
        if (last?.type === 'ol') last.items.push(item);
        else blocks.push({ type: 'ol', items: [item] });
      } else if (/^[-*]\s+/.test(line)) {
        const item = line.replace(/^[-*]\s+/, '');
        const last = blocks[blocks.length - 1];
        if (last?.type === 'ul') last.items.push(item);
        else blocks.push({ type: 'ul', items: [item] });
      } else {
        blocks.push({ type: 'p', text: line });
      }
    });
  return blocks;
};

// **textAlign: 'left' 是必要的，不是預設值。** /demo 載入的 App.css 有一行
// Vite 樣板留下來的 `#root { text-align: center }`，所以整個遊戲的文字預設置中；
// TalkText 與 QuestionText 都各自寫了 align="left" 退出它，長文更不能少這一行
//（Dong 2026-09-11 回報內文置中）。
const RichText = ({ text, sx }) => (
  <Box sx={{ color: 'text.primary', textAlign: 'left', ...sx }}>
    {toBlocks(text).map((b, i) => {
      if (b.type === 'h') {
        return (
          <Typography
            key={i}
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              // 小標與**它上面那一段**之間要比段間距大，與**它下面那一段**要小
              // ——這樣它看起來屬於下面那一節，而不是漂在兩節中間。
              mt: i === 0 ? 0 : 3,
              mb: 0.5,
            }}
          >
            {inline(b.text)}
          </Typography>
        );
      }
      if (b.type === 'hr') {
        return (
          <Box
            key={i}
            sx={{ my: 3, borderBottom: 1, borderColor: 'divider' }}
          />
        );
      }
      if (b.type === 'quote') {
        return (
          // 左邊一條線 ＋ 縮排。**不用斜體**（中文斜體是把字硬拉歪，不是另一套字），
          // 也不用引號——創作者引的原文裡常常自己就有引號。
          <Box
            key={i}
            sx={{
              my: 2,
              pl: 2,
              borderLeft: 3,
              borderColor: 'divider',
              color: 'text.secondary',
            }}
          >
            {b.lines.map((ln, j) => (
              <Typography key={j} variant="body2" sx={{ lineHeight: 1.9 }}>
                {inline(ln)}
              </Typography>
            ))}
          </Box>
        );
      }
      if (b.type === 'ul' || b.type === 'ol') {
        return (
          <Box
            key={i}
            component={b.type === 'ol' ? 'ol' : 'ul'}
            sx={{ pl: 3, my: 1 }}
          >
            {b.items.map((it, j) => (
              <Typography key={j} component="li" variant="body2" sx={{ lineHeight: 1.9 }}>
                {inline(it)}
              </Typography>
            ))}
          </Box>
        );
      }
      return (
        <Typography key={i} variant="body2" sx={{ lineHeight: 1.9, mb: 1.5 }}>
          {inline(b.text)}
        </Typography>
      );
    })}
  </Box>
);

RichText.propTypes = {
  text: PropTypes.string,
  sx: PropTypes.object,
};

export default RichText;
