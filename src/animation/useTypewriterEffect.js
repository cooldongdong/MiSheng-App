import { useState, useEffect } from 'react';

/**
 * Custom hook for typewriter effect.
 * @param {string} text - The text to display with typewriter effect.
 * @param {number} speed - Typing speed in milliseconds per character.
 * @param {'type'|'instant'|'silent'} mode - 文字怎麼出現（上下滑翻頁）：
 *   - 'type'    正常打字
 *   - 'instant' 直接給完整文字。用在「往回走的那一頁」——玩家已經讀過了，
 *               從頭再打一次看起來像倒帶而不像回顧
 *   - 'silent'  先不要有字。用在「往前滑、正在滑過去的那一頁」——它待會就會變成
 *               真正的當前頁並從第一個字開始打，預覽先把字放上去的話，交接的瞬間
 *               字會先消失再重打，那正是閃爍的來源
 * @returns {string} displayText - The text currently displayed with typewriter effect.
 */

export const useTypewriterEffect = (text, speed = 50, mode = 'type') => {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  // Reset the typewriter effect when the text changes
  useEffect(() => {
      setDisplayText('');
      setCharIndex(0);
  }, [text]);

  // Typewriter effect logic
  useEffect(() => {
    // silent 是「還沒開始」，不是「打了但不顯示」。讓計時器在背後跑完的話，
    // 這一頁被滑成當前頁、模式換回 type 的那一刻，字會直接從中間冒出來。
    if (mode !== 'type') return;
    if (text && charIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, text, speed, mode]);

  if (mode === 'instant') return text;
  if (mode === 'silent') return '';
  return displayText;
};
