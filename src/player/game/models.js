// 七種 model 對到七個元件。
//
// 抽出來是因為現在有兩個地方要照 model 決定畫什麼：GameController（現在這一頁）
// 與 PeekPage（上下拉時露出的前後頁）。兩份 map 遲早會分岔——新增第八種 model 時
// 只改到其中一份，另一邊就會靜默地畫出 "Unknown model type"。
import TalkModel from './TalkModel';
import QuizModel from './QuizModel';
import MissionStartModel from './MissionStartModel';
import GameStartModel from './GameStartModel';
import MissionAnswerInputModel from './MissionAnswerInputModel';
import CustomValueInputModel from './CustomValueInputModel';
import ImgModel from './ImgModel';

export const MODEL_COMPONENTS = {
  Talk: TalkModel,
  Quiz: QuizModel,
  MissionStart: MissionStartModel,
  GameStart: GameStartModel,
  MissionAnswerInput: MissionAnswerInputModel,
  Img: ImgModel,
  CustomValueInput: CustomValueInputModel,
};

export default MODEL_COMPONENTS;
