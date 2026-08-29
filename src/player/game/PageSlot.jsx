import { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { GameContext } from '../store/game-context';
import { MODEL_COMPONENTS } from './models';

// 畫「某一列」的那一頁——現在這一頁與上下相鄰的預覽都走這裡（上下滑翻頁）。
//
// **同一個元件畫全部三種，是這個檔案存在的理由。** GameController 用 row.id 當 key
// 把它們排成一列，於是玩家滑過去、currentId 換人的時候，原本那張預覽**還是同一個
// React 元素**——只是 live 從 false 變 true。DOM 不重建、圖片不重新解碼、打字機的
// 進度不歸零。
//
// 之前是「當前頁走一條路、預覽走另一條路」，落地時等於把預覽拆掉、再叫當前頁去換
// img 的 src。而瀏覽器換 src 時**會繼續畫舊圖直到新圖解碼完**（實測），所以那一格
// 畫面是「預覽的 B → 當前頁還在畫的 A → B」——閃的就是上一頁的背景回來一下
// （Dong 2026-08-28 兩次回報，一頁有角色圖、一頁沒有時最明顯，因為立繪是整個新建的
// 元素、連舊圖都沒得畫）。
//
// 兩個方向給的東西不一樣，這是刻意的（Dong 2026-08-28）：
//   - 往下拉看到的是**上一頁**，玩家已經看過了，所以整頁照實渲染
//   - 往上拉看到的是**下一頁**，那是還沒發生的劇情，所以 hideContent——底圖、
//     講話的人的立繪、對白框的漸層都在，就是沒有台詞／選項／謎面圖
// 為什麼停在這裡：短影片預覽下一則是讓你決定要不要繼續看，解謎的下一頁是謎底，
// 提前露出就沒得玩了。場景換了沒、換誰在講話，那是方位感不是答案。
//
// **這裡畫的一定是那一頁自己的元件，不是外面拼一棵長得像它的樹。**
// 曾經拼過，於是放手那一刻要從「拼的樹」換成「真的元件」——那是整棵重新掛載，
// 角色圖被砍掉重生，畫面閃一下（Dong 回報：一頁有角色圖、一頁沒有時最明顯）。
// 按 NEXT 之所以不閃，是因為那條路上元件實例活著、React 只換 img 的 src。
// 同一棵樹只換 prop，才追得上按鈕的順。
//
// **預覽拿到的是一份唯讀的 context。** 兩個理由：
//   ① 三個 model 根本不收 currentRow——MissionStart 與 MissionAnswerInput 讀
//      context 的 currentMissionId、Quiz 用 context 的 currentId 去撈自己的選項。
//      不換掉這兩個值，預覽會忠實地畫出**現在這一頁**的內容，看起來像壞掉。
//   ② 會寫遊戲狀態的那幾支（goToId／updateMissionStatus／unlockHint…）在這裡換成
//      空函式。目前沒有任何 model 在掛載時呼叫它們，所以這一層是為了「以後也不會」——
//      一個畫在旁邊的預覽把玩家的關卡標成完成，是那種很久以後才會被發現的 bug。
const noop = () => {};

const PageSlot = ({
  row,
  live = false,
  hideContent = false,
  textMode = 'type',
  onNext,
  canProceed = false,
  devTools = false,
}) => {
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

  const ModelComponent = MODEL_COMPONENTS[row.model];
  if (!ModelComponent) return null;

  return (
    // live 的那一格拿真的 context；預覽拿唯讀的那份。**兩種都包一層 Provider**——
    // 只在預覽時才包的話，切成 live 會讓樹的形狀變了，React 就會整棵重掛，
    // 那正是這個檔案要避免的事。
    <GameContext.Provider value={live ? ctx : scoped}>
      {/* 預覽的 canProceed 給 true：那一頁玩家離開的時候 NEXT 是亮著的，預覽要長得
          跟記憶一樣。反正預覽那一格是 inert ＋ pointerEvents:none，按不到。 */}
      <ModelComponent
        currentRow={row}
        onNext={live ? onNext : noop}
        canProceed={live ? canProceed : true}
        devTools={live ? devTools : false}
        textMode={textMode}
        hideContent={hideContent}
      />
    </GameContext.Provider>
  );
};

PageSlot.propTypes = {
  row: PropTypes.object,
  live: PropTypes.bool,
  hideContent: PropTypes.bool,
  textMode: PropTypes.oneOf(['type', 'instant', 'silent']),
  onNext: PropTypes.func,
  canProceed: PropTypes.bool,
  devTools: PropTypes.bool,
};

export default PageSlot;
