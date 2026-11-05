// 首頁「改一格看看」那段的資料：把畫面上那幾格，包成一份 validateGame 吃得下的完整遊戲。
//
// **為什麼不自己寫一段假的錯誤訊息。** 首頁要證明的是「謎生會指出哪張表哪一格錯」，
// 如果那句話是首頁自己編的，它就只是文案；接上真的 validator，使用者看到的
// 就是 /create 實際會講的那一句——validator 的措辭改了，首頁跟著變，不會兩邊各說各話。
//
// 其餘六張表填最小的合法內容，目的只是讓 validator 不去抱怨首頁沒展示的東西。

import { REQUIRED_FIELDS } from '../../shared/validator/validateGame.js';

export const CHARACTERS = ['謎之音', '旁白', '玩家.'];

const table = (type, rows) => ({ fields: REQUIRED_FIELDS[type], rows: rows.map(fill(type)) });

// 每一列都補齊所有欄位成空字串——papaparse header:true 讀進來的列就是長這樣
const fill = (type) => (row) =>
  Object.fromEntries(REQUIRED_FIELDS[type].map((f) => [f, row[f] ?? '']));

// cells：首頁可以改的那幾格 { model, speaker, text, answer }
export const buildTables = ({ model, speaker, text, answer }) => ({
  character: table('character', CHARACTERS.map((name) => ({ name }))),
  config: table('config', [{ id: 'demo', title: 'MiSheng 的多列宇宙' }]),
  mission: table('mission', [{ id: '1', title: '李白的字謎', answer }]),
  hint: table('hint', []),
  prop: table('prop', []),
  story: table('story', []),
  rundown: table('rundown', [
    { id: '1', model: 'GameStart' },
    { id: '2', model, speaker, text },
    { id: '3', model: 'MissionStart', missionId: '1' },
    { id: '4', model: 'MissionAnswerInput', missionId: '1' },
  ]),
});

// 首頁畫面上的試算表只畫 rundown 第 3 列（id=2）與 mission 第 2 列，
// 所以 validator 回報的列號就是使用者眼前那一格的列號。
export const PLAYGROUND_ROW = { rundown: 3, mission: 2 };
