import { useContext, useEffect, useRef, useState } from 'react';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import ContentList from '../common/ContentList';
import HintAccordion from '../common/HintAccordion';
import ConfirmDialog from '../common/ConfirmDialog';
import useHintTick from '../../hook/useHintTick';
import {
  freshHintIndexes,
  hintKeyOf,
  hintRemainingMs,
  hintRemainingMinutes,
  isHintUnlocked,
} from '../../game/hintTimer';

const HintPage = () => {
  const {
    characterData,
    hintData,
    getMissionById,
    currentMissionId,
    unlockedHints,
    unlockHint,
    missionStartedAt,
    hintsSeenAt,
    markHintsSeen,
  } = useContext(GameContext);
  // 同 BottomNavigation：進關時刻一變就立刻重算（見 useHintTick 的說明）
  const now = useHintTick(missionStartedAt?.[currentMissionId]);
  const [currentHints, setCurrentHints] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false); // Dialog 的開關
  const [currentHintIndex, setCurrentHintIndex] = useState(null); // 當前選擇的提示索引
  const [expandedHints, setExpandedHints] = useState([]);
  // 哪一張提示圖正在放大。**整頁一份**，同 PropPage／StoryPage——
  // 「同時只有一張圖在放大」是整頁的不變式，放在 HintContent 裡就變成每則一份，
  // 其他則的放大鈕會浮在放大的圖上面（見 HintContent 檔頭）。
  const [fullScreenIndex, setFullScreenIndex] = useState(null);
  const handleToggleFullScreen = (index) =>
    setFullScreenIndex((prev) => (prev === index ? null : index));

  const currentMission = getMissionById(currentMissionId);

  useEffect(() => {
    if (!currentMission) {
      // 沒有關卡＝玩家在封面上（GameStart），不是「還沒載好」。
      // **要清掉，不能只 return**——直接 return 會讓這一頁停在上一關，
      // 於是從第三關回封面時這裡還列著第三關的東西。
      // 今天踩不到是因為 currentMissionId 從來不會被清空；GameStart 一落地就會踩到。
      setCurrentHints([]);
      return;
    }
    if (!Array.isArray(hintData)) {
      // console.log('hintData 不是有效的數組！');
      return;
    }
    const filteredHints = hintData.filter(
      (row) => row.missionId === currentMission.id
    );
    const updatedFilteredHints = filteredHints.map((hint) => {
      const speaker = characterData.find((char) => char.name === hint.speaker);
      return { ...hint, avatar: speaker?.avatar || '' };
    });

    setCurrentHints(updatedFilteredHints);
  }, [currentMissionId, hintData, currentMission]);

  // 換關就把展開狀態清掉。
  //
  // expandedHints 裝的是索引（[0, 2]），而索引只在「這一關的提示清單」裡有意義——
  // 上一關的第 0 則跟這一關的第 0 則是兩則不同的提示。
  //
  // 一般玩遊戲時撞不到，是因為要換關就得先離開提示分頁，而分頁切換會把這個元件
  // 卸載、state 跟著歸零。但 **/create 的三欄畫面可以在不離開提示分頁的情況下換關**
  // ——點右邊流程圖的方塊會 goToId 跳到別關，而中間欄的分頁索引（GameShell 的 value）
  // 不會被碰。於是這個元件一直掛著，上一關的展開狀態就套到了新的一關上
  // （Dong 2026-09-01 回報：在某一關解鎖提示後跳到沒解鎖的那關，那關的提示也是開的）。
  //
  // 順便把「自動展開」的權限重新給一次——那是下一個 effect 的事，但時機一模一樣：
  // 進到這一頁、或換了一關，都算是新的一輪。
  const autoExpandArmed = useRef(true);
  useEffect(() => {
    setExpandedHints([]);
    // 放大狀態也是索引，換關之後指到的是另一則提示（理由同上）
    setFullScreenIndex(null);
    autoExpandArmed.current = true;
  }, [currentMissionId]);

  // 把「剛到期的」攤開給他看，然後記下他看到哪個時刻為止。
  //
  // **解鎖已經不在這裡了**——它搬去 game-provider 的全域 effect，一到期就做，
  // 不必等玩家切到這一頁（理由見那邊的註解：留在這裡會讓 hint_auto_unlock 的
  // 時間戳全部擠在「打開提示分頁的那一秒」）。這一頁剩下的是通知那一半。
  //
  // **自動展開只發生在「剛進到這一頁」那一次。** 從別頁切回來、而且真的有東西
  // 在等他（就是導覽列那顆紅點），直接攤開來給他看；但如果他本來就停在提示頁，
  // 就不展開——正在讀的人不該被突然長出來的內容把版面推走。
  //
  // 靠的是這個元件切分頁時會卸載（所以每次進來都是新的一輪），
  // 加上換關時重新給一次權限（見上面那個 effect）。
  //
  // **權限在「進頁評估完那一次」就繳回，不管有沒有東西到期。** 留到第一次真的
  // 有東西到期才用掉的話，會變成：進頁時什麼都沒到期、人就坐在這一頁，然後某一則
  // 到期時被展開——那正是「他原本就在提示頁」的情況，不該打擾他。
  //
  // **順序是先算再標記。** markHintsSeen 會把 seenAt 推到 now，而 fresh 的判準
  // 正是「到期時刻晚於 seenAt」——反過來寫就是自己把自己清成空的，永遠不會展開。
  // 同 2026-09-07 那一串「在狀態還沒真正生效時就對它動作」。
  const startedAt = missionStartedAt?.[currentMission?.id];
  useEffect(() => {
    if (!currentMission) return;
    const fresh = freshHintIndexes(
      currentHints,
      startedAt,
      hintsSeenAt?.[currentMission.id],
      now
    );
    const armed = autoExpandArmed.current;
    // 有資料可以評估了，這一輪就算「進頁的那一次」
    const ready = currentHints.length > 0 && startedAt;
    if (ready) autoExpandArmed.current = false;

    if (armed && fresh.length > 0) {
      setExpandedHints((prev) => [...new Set([...prev, ...fresh])]);
    }
    // 人就在這一頁，所以「到 now 為止到期的」他都看得到了——包含他坐在這裡的
    // 期間才到期的那些。不標記的話紅點會在他眼前亮起來。
    //
    // **但要等 ready，理由跟上面那一行一樣。** 這個元件掛載時 currentHints 還是
    // 空的（它由上面那條 effect 在同一個 commit 裡填），所以第一趟一定算出
    // fresh = []。無條件標記的話，那一趟就把 seenAt 推到了 now，等下一趟資料
    // 進來時「到期時刻晚於 seenAt」永遠不成立——**提示不再自動展開**
    //（Dong 2026-09-22 回報）。
    //
    // 上面那句「順序是先算再標記」講的是同一件事，但它只管**一次 effect 之內**
    // 的兩行；真正咬人的順序跨了兩趟 render。**把兩件事綁在同一個 ready 上**，
    // 就不必再靠人記得它們必須同步。
    if (ready) markHintsSeen(currentMission.id, now);
    // markHintsSeen 每次 render 都是新函式，放進 deps 會讓這條 effect 每次都重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, currentHints, startedAt, hintsSeenAt, currentMission]);

  const handleExpand = (index) => {
    setExpandedHints((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleUnlockClick = (index) => {
    setCurrentHintIndex(index);
    setDialogOpen(true);
  };

  const handleConfirmUnlock = () => {
    if (currentHintIndex !== null) {
      // 'manual'＝玩家自己按了確認對話框的「確定」，這是卡關最直接的證據。
      unlockHint(currentMission.id, hintKeyOf(currentHints[currentHintIndex]), 'manual');
      setTimeout(() => {
        handleExpand(currentHintIndex);
      }, 100); // 略微延遲確保狀態更新,確保在解鎖後才展開
    }
    setDialogOpen(false);
    setCurrentHintIndex(null);
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setCurrentHintIndex(null);
  };

  return (
    <PageContainer>
      <PageTitleText title="提示" />
      <ContentList
        items={currentHints}
        renderItem={(hint, index) => (
          <HintAccordion
            key={index}
            index={index}
            hint={hint}
            isUnlocked={isHintUnlocked(
              unlockedHints[currentMission?.id],
              hint,
              index
            )}
            isExpanded={expandedHints.includes(index)}
            onExpand={handleExpand}
            onUnlock={handleUnlockClick}
            remainingMinutes={
              hintRemainingMinutes(hintRemainingMs(hint, startedAt, now)) ??
              undefined
            }
            fullScreenIndex={fullScreenIndex}
            onToggleFullScreen={handleToggleFullScreen}
          />
        )}
        emptyText="No hints available"
      />

      {/* 解鎖確認 Dialog */}
      <ConfirmDialog
        open={dialogOpen}
        onClose={handleCancel}
        onConfirm={handleConfirmUnlock}
        title={'確認解鎖'}
        confirmText={`確定要解鎖提示 ${currentHintIndex + 1} 嗎？`}
      />
    </PageContainer>
  );
};

export default HintPage;
