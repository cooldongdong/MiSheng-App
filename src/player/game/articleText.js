// {{key}} 替換。Talk 與 Quiz 各自有一份，其餘頁面吃不到——
// 新的 model 至少不要再多欠一筆。
// **在 markdown 解析之前做**：反過來的話，變數值裡如果有 ** 會被當成語法。
export const articleTextOf = (row, customPairs) =>
  (row?.text || '').replace(
    /\{\{(.*?)\}\}/g,
    (match, key) => customPairs?.[key] ?? match
  );
