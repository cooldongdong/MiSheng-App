import { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../store/game-context';
import ThemeColorLayer from '../component/layer/ThemeColorLayer';
import Layer from '../component/layer/Layer';
import BackgroundLayer from '../component/layer/BackgroundLayer';
import { MODEL_COMPONENTS } from './models';

// 上下拉時露出來的那一頁（COO-135）。
//
// 兩個方向給的東西不一樣，這是刻意的（Dong 2026-08-28）：
//   - 往下拉看到的是**上一頁**，玩家已經看過了，所以整頁照實渲染
//   - 往上拉看到的是**下一頁**，那是還沒發生的劇情，所以只給底圖
// 「只給底圖」不是技術上的偷懶，是這個產品的體裁決定的：短影片預覽下一則是讓你決定
// 要不要繼續看，解謎的下一頁是謎底，提前露出就沒得玩了。底圖給的是場景換沒換——
// 那是方位感，不是答案。
//
// **預覽拿到的是一份唯讀的 context。** 兩個理由：
//   ① 三個 model 根本不收 currentRow——MissionStart 與 MissionAnswerInput 讀
//      context 的 currentMissionId、Quiz 用 context 的 currentId 去撈自己的選項。
//      不換掉這兩個值，預覽會忠實地畫出**現在這一頁**的內容，看起來像壞掉。
//   ② 會寫遊戲狀態的那幾支（goToId／updateMissionStatus／unlockHint…）在這裡換成
//      空函式。目前沒有任何 model 在掛載時呼叫它們，所以這一層是為了「以後也不會」——
//      一個畫在旁邊的預覽把玩家的關卡標成完成，是那種很久以後才會被發現的 bug。
const noop = () => {};

const PeekPage = ({ row, mode }) => {
  const ctx = useContext(GameContext);

  const scoped = useMemo(() => {
    // missionId 不一定對得到真的關卡（0 在這份資料裡是「沒有關卡」的哨兵值，
    // 但也可能真的有一關叫 0——見 README 的實測），對不到就沿用現在的
    const mission = ctx.getMissionById?.(row?.missionId);
    return {
      ...ctx,
      currentId: row?.id ?? ctx.currentId,
      currentMissionId: mission ? row.missionId : ctx.currentMissionId,
      goToId: noop,
      setCurrentId: noop,
      goBack: noop,
      canGoBack: false,
      updateMissionStatus: noop,
      unlockHint: noop,
      updateCustomPairs: noop,
      setMapMode: noop,
      setSpatialNav: noop,
    };
  }, [ctx, row]);

  if (!row) return null;

  if (mode === 'background') {
    // Img 這一種的 backgroundImg 就是它要給玩家看的那張圖（ImgModel 把它畫在卡片裡，
    // 而且根本沒有底圖層）——拿它當預覽的底圖等於直接把謎面攤開。退回關卡底圖。
    const src =
      row.model === 'Img'
        ? ctx.getMissionById?.(row.missionId)?.backgroundImg
        : row.backgroundImg || ctx.getMissionById?.(row.missionId)?.backgroundImg;

    // 沒有底圖就只留 ThemeColorLayer 的底色，不畫 BackgroundLayer——它在 src 是空的
    // 時候會鋪一層中性深灰漸層，而真正的頁面在同樣情況下是不畫這一層的。預覽要長得
    // 像那一頁，不是長得像「一張沒載到圖的頁面」。
    return (
      <ThemeColorLayer>
        {src ? (
          <Layer>
            <BackgroundLayer src={ctx.getImg(src)} />
          </Layer>
        ) : (
          <span />
        )}
      </ThemeColorLayer>
    );
  }

  const ModelComponent = MODEL_COMPONENTS[row.model];
  if (!ModelComponent) return null;

  return (
    <GameContext.Provider value={scoped}>
      {/* canProceed 給 true：那一頁玩家離開的時候 NEXT 是亮著的，預覽要長得跟記憶
          一樣。反正整棵樹是 inert ＋ pointerEvents:none，按不到。 */}
      <ModelComponent currentRow={row} onNext={noop} canProceed preview />
    </GameContext.Provider>
  );
};

PeekPage.propTypes = {
  row: PropTypes.object,
  mode: PropTypes.oneOf(['full', 'background']).isRequired,
};

export default PeekPage;
