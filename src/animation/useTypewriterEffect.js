import { useState, useEffect } from 'react';

/**
 * Custom hook for typewriter effect.
 * @param {string} text - The text to display with typewriter effect.
 * @param {number} speed - Typing speed in milliseconds per character.
 * @param {boolean} instant - 直接給完整文字，不打字。
 *   用在上下拉時預覽的「上一頁」（COO-135）：那一頁玩家已經讀過了，讓它在預覽裡
 *   從頭再打一次，看起來像倒帶而不像回顧。
 * @returns {string} displayText - The text currently displayed with typewriter effect.
 */

export const useTypewriterEffect = (text, speed = 50, instant = false) => {
  const [displayText, setDisplayText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  // Reset the typewriter effect when the text changes
  useEffect(() => {
      setDisplayText('');
      setCharIndex(0);
  }, [text]);

  // Typewriter effect logic
  useEffect(() => {
    if (text && charIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[charIndex]);
        setCharIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [charIndex, text, speed]);

  return instant ? text : displayText;
};
