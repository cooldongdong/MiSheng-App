// 角色立繪 → 重畫的 SVG。
// key 用的是 demo 試算表裡的檔名：首頁各段沿用試算表的寫法（character.straight），
// 畫面要用插畫還是照片，只在這一個地方決定。
import Mizhiyin from './Mizhiyin';
import Libai from './libai/LibaiChibi';

export const ART_BY_IMG = {
  'mizhiyin.jpg': Mizhiyin,
  'pangbai-s.jpg': Libai,
};
