// 八種 model 的一句話說明，對照文件 docs/sheet/models.md 那張表。
// 順序＝首頁輪播的順序：從封面開始，照一場遊戲實際會遇到的先後。
export const MODEL_NOTES = {
  GameStart: '遊戲封面。標題、介紹、開始鈕，資料從 config 表來。',
  Talk: '對白，最常用的一種。一列一句。',
  Quiz: '選擇題。每個選項各佔一列，選了哪個就往哪裡走。',
  CustomValueInput: '讓玩家打一段字，例如取名字。之後的對白可以叫出來用。',
  MissionStart: '一關的開場：關卡名、背景圖、導航。',
  MissionAnswerInput: '讓玩家打答案。對了才放行。',
  Img: '一張圖，玩家可以點開放大。',
  Article: '一整頁可以捲的長文，適合導覽解說、地方誌。',
};

export const MODELS = Object.keys(MODEL_NOTES);
