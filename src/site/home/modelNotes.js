import Libai from "./art/Libai";
import Mizhiyin from "./art/Mizhiyin";
import DiaryWheel from "./art/DiaryWheel";

// 八種 model 的一句話說明，對照文件 docs/sheet/models.md 那張表。
// 順序＝首頁輪播的順序：從封面開始，照一場遊戲實際會遇到的先後。
export const MODEL_NOTES = {
  GameStart: "遊戲封面。標題、介紹、開始鈕，資料從 config 表來。",
  Talk: "對白，最常用的一種。一列一句。",
  Quiz: "選擇題。每個選項各佔一列，選了哪個就往哪裡走。",
  CustomValueInput: "讓玩家打一段字，例如取名字。之後的對白可以叫出來用。",
  MissionStart: "一關的開場：關卡名、背景圖、導航。",
  MissionAnswerInput: "讓玩家打答案。對了才放行。",
  Img: "一張圖，玩家可以點開放大。",
  Article: "一整頁可以捲的長文，適合導覽解說、地方誌。",
};

export const MODELS = Object.keys(MODEL_NOTES);

// 每一種在手機上畫的那一頁（餵給 PlayerScreen）。文案取自 demo 與文件，不放第五關的謎面；
// Article 是跟 demo 劇情無關的導覽範例，首頁不替 demo 發明它沒有的設定。
export const MODEL_PAGES = {
  GameStart: { model: "GameStart", title: "MiSheng 的多列宇宙", art: Libai },
  Talk: { model: "Talk", speaker: "謎之音", text: "你醒啦！" },
  Quiz: {
    model: "Quiz",
    speaker: "旁白",
    text: "你想聽白話版的，還是遊戲體驗版的？",
    options: ["白話版", "遊戲體驗版"],
  },
  CustomValueInput: {
    model: "CustomValueInput",
    speaker: "謎之音",
    text: "你要取什麼酷酷的名字呢？",
    input: "小白",
  },
  MissionStart: {
    model: "MissionStart",
    title: "旁白的字謎",
    description: "一口咬掉牛尾巴，猜一個字。",
    art: Mizhiyin,
  },
  MissionAnswerInput: {
    model: "MissionAnswerInput",
    title: "旁白的字謎",
    art: Libai,
    input: "告",
  },
  Img: { model: "Img", art: DiaryWheel },
  Article: {
    model: "Article",
    title: "老街導覽",
    body: [
      "這條街在清代是碼頭邊的米市。",
      "左手邊第三間的門楣上，還留著當年商號的木匾。匾上的字少了一筆，據說是師傅故意的。",
      { h: "下一關的密碼" },
      "找到它之後，數一數門口有幾級台階，那就是下一關的密碼。",
      "走到街尾的土地公廟前，回頭看一眼整條街：屋簷的高度一路往下降，那是當年依著河岸的坡度蓋的。",
    ],
  },
};
