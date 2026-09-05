import { useEffect, useRef, useState } from 'react';
import { Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { useTypewriterEffect } from '../../animation/useTypewriterEffect';

// 對白的內文。**打字機在這裡跑，不在 model 裡。**
//
// 原本 `displayText` 是 TalkModel 的 state：每打一個字就兩次 setState，整棵子樹
//（底圖、立繪、漸層、對白框）跟著重繪，還順帶一次強制重排（scrollTop = scrollHeight）。
// 速度是 50ms 一個字，而 demo 的對白平均 70 字 —— **一次翻頁就是三秒半、每秒 20 輪
// 的重繪 ＋ 重排**。Android 上那段時間點什麼都沒反應，要等打完或連點兩下
//（Dong 2026-09-05 回報：「要等大概兩秒後或連點兩下才可以按下按鈕」）。
//
// 把 state 關進這個葉子元件之後，每個字只重繪這一個 Typography。
//
// 捲動的兩件事也一起搬進來——它們本來就只跟這個容器有關：
//   ① 使用者自己往上捲過就別再自動跟到底（不然他永遠讀不到前面）
//   ② 沒有自己捲的話，字長出來就跟著捲到底
const TYPE_SPEED_MS = 50;

const TalkText = ({ text, typeMode = 'instant', height = '120px', textShadow }) => {
  const ref = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const displayText = useTypewriterEffect(text || '', TYPE_SPEED_MS, typeMode);

  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const handleScroll = () => {
      const isAtBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 5;
      if (!isAtBottom) setIsUserScrolling(true);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 換一句話就重新開始跟到底
  useEffect(() => setIsUserScrolling(false), [text]);

  useEffect(() => {
    const container = ref.current;
    if (!container || isUserScrolling) return;
    container.scrollTop = container.scrollHeight;
  }, [displayText, isUserScrolling]);

  return (
    <Typography
      variant="body2"
      align="left"
      gutterBottom
      ref={ref}
      sx={{
        whiteSpace: 'pre-wrap',
        color: '#fff',
        height: height,
        overflowY: 'auto',
        // **不要改成 pan-y。** 宣告 pan-y 等於把垂直手勢整段交給瀏覽器，
        // 而瀏覽器在手指按下那一刻就決定歸屬、不會中途交還——於是「對白捲到底
        // 就能翻頁」永遠不會發生（Android 實測）。維持 none，捲動由 useSwipeFlow
        // 自己做，到底之後它才把剩下的位移轉成翻頁。
        touchAction: 'none',
        textShadow: textShadow,
      }}
    >
      {displayText}
    </Typography>
  );
};

TalkText.propTypes = {
  text: PropTypes.string,
  // 'type' 正常打字｜'instant' 直接給全文｜'silent' 先不要有字（見 useTypewriterEffect）
  typeMode: PropTypes.oneOf(['type', 'instant', 'silent']),
  height: PropTypes.string,
  textShadow: PropTypes.string,
};

export default TalkText;
