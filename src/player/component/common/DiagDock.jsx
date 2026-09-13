import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { getDiagTabs, subscribeDiag, diagEnabled } from '../../../shared/diagBus';

// 現場診斷的唯一一塊面板（`?diag=1`）。各處的讀數由 diagBus 送進來，這裡用分頁顯示。
//
// **設計的三條約束，全部來自踩過的坑：**
//
// 1. **預設收起來，只留一顆小標籤。** 量測工具鋪滿畫面的話，它會蓋住正在被量的
//    東西——相機診斷第一版就把相機畫面整個遮掉了。
// 2. **標籤上要直接寫著結論。** 多數時候「有沒有出事」看那一眼就夠，不必展開；
//    所以每個分頁可以給一個 badge（例如相機的 `blocked／denied`）。
// 3. **內容要選得起來。** 它存在的意義就是被複製貼回來，而手機上截圖比複製貴。
//
// 位置在**左下**：右下留給 CreateApp 自己的東西，正下方是遊戲的分頁列，
// 而左下在遊戲與載入畫面上都是空的。
const DiagDock = () => {
  // **刻意不用 `useSyncExternalStore`。** 它要求 getSnapshot 每次回傳同一個參考，
  // 否則會判定狀態一直在變而無限重繪——我一開始就是這樣讓 /create 與 /demo 全部
  // 白畫面的（而且跟有沒有帶 ?diag=1 無關，因為 hook 不能條件呼叫）。
  // bus 那邊已經改成回傳快取的快照，但這裡再退一步用最保守的寫法：
  // 就算哪天快照又變得不穩定，最糟也只是多幾次重繪，**不會把整棵樹拖下水**。
  // 一個診斷工具不該有能力弄垮它正在觀察的東西。
  const [tabs, setTabs] = useState(getDiagTabs);
  useEffect(() => subscribeDiag(() => setTabs(getDiagTabs())), []);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // 目前這個分頁被移除時（例如關掉相機道具），退回第一個還在的分頁。
  // 不處理的話會停在一個空白的內容區，看起來像壞掉。
  useEffect(() => {
    if (!tabs.length) return;
    if (!active || !tabs.some((t) => t.key === active)) setActive(tabs[0].key);
  }, [tabs, active]);

  if (!diagEnabled() || !tabs.length) return null;

  const current = tabs.find((t) => t.key === active) || tabs[0];
  // 標籤上的摘要：優先顯示目前分頁的 badge，沒有就顯示有幾個分頁
  const summary = tabs
    .filter((t) => t.badge)
    .map((t) => t.badge)
    .join(' · ');

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        zIndex: 2147483000, // 要贏過相機舞台(1200)、導覽(1500)與所有對話框
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 0.75,
        maxWidth: 'calc(100vw - 16px)',
        pointerEvents: 'none', // 面板以外的地方照常操作
      }}
    >
      {/* **面板一直掛著，收合時只是藏起來。**
          不渲染的話，以 node 形式進來的分頁會跟著卸載——而既有的 DiagOverlay
          正是靠一直掛著才數得到觸控事件（down/up/cancel/click）。
          收合就把它拆掉的話，那個面板等於只在你盯著它的時候才工作。 */}
      <Box
          sx={{
            display: open ? 'flex' : 'none',
            pointerEvents: 'auto',
            width: 'min(520px, calc(100vw - 16px))',
            maxHeight: '46vh',
            flexDirection: 'column',
            borderRadius: '8px',
            overflow: 'hidden',
            bgcolor: 'rgba(0,0,0,0.92)',
            border: '1px solid rgba(158,238,255,.25)',
          }}
        >
          {/* 分頁列。只有一個分頁時也留著——它同時是「現在在看什麼」的標示 */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 0.75 }}>
            {tabs.map((t) => (
              <Box
                key={t.key}
                component="button"
                onClick={() => setActive(t.key)}
                sx={{
                  px: 1,
                  py: 0.4,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: t.key === current.key ? '#9ef' : 'rgba(158,238,255,.25)',
                  bgcolor: t.key === current.key ? 'rgba(158,238,255,.16)' : 'transparent',
                  color: '#9ef',
                  font: '11px/1.2 ui-monospace, monospace',
                  cursor: 'pointer',
                }}
              >
                {t.title}
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              px: 1,
              pb: 1,
              color: '#9ef',
              font: '11px/1.6 ui-monospace, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              userSelect: 'text',
            }}
          >
            {/* 同理：每個分頁的內容都渲染，非當前的用 display 藏起來，
                切換分頁不會把它重新掛載一次、把累積的讀數歸零。 */}
            {tabs.map((t) => (
              <Box
                key={t.key}
                sx={{ display: t.key === current.key ? 'block' : 'none' }}
              >
                {t.node ?? t.text ?? '（沒有內容）'}
              </Box>
            ))}
          </Box>
        </Box>

      <Box
        component="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          pointerEvents: 'auto',
          px: 1,
          py: 0.5,
          borderRadius: '14px',
          border: '1px solid rgba(158,238,255,.45)',
          bgcolor: 'rgba(0,0,0,.82)',
          color: '#9ef',
          font: '11px/1.2 ui-monospace, monospace',
          cursor: 'pointer',
          maxWidth: 'calc(100vw - 16px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {open ? '▼' : '▲'} diag{summary ? `：${summary}` : `（${tabs.length}）`}
      </Box>
    </Box>
  );
};

export default DiagDock;
