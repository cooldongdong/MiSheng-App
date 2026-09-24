import { useContext, useEffect, useMemo, useState } from 'react';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import ContentList from '../common/ContentList';
import ZoomableImage from '../common/ZoomableImage';
import ArticleCard from '../common/ArticleCard';
import { articleTextOf } from '../../game/articleText';
import { useMissionStories } from '../../hook/useMissionStories';

// 故事頁＝這一關的 story 表圖卡，加上 rundown 裡勾了 story 的 Article／Img。
//
// **兩個來源的解鎖時機不一樣，而且是刻意的：**
//   · story 表 —— 進關就看得到（它本來就是這樣，沒有任何解鎖）
//   · rundown 的 story 列 —— **這一關解完才收進來**（放棄也算，兩者都記成 complete）
// rundown 的列是流程的一部分，多半是解完謎才該給的補充；進關就放上故事頁等於
// 提前發答案。「解完了沒」而不是「讀過了沒」：滑過文章的人正好需要之後回頭補讀，
// 而且解鎖不用多存任何玩家狀態（只有導覽列的紅點多記一格 storySeen）。
//
// 回頭看不用另外做：關卡頁點回已解完的那一關，這一頁就會跟著換成那一關。
//
// 順序：story 表在前，rundown 收進來的照 rundown 順序接在後（2026-09-24 定案）。
const StoryPage = () => {
  const {
    getImg,
    getMissionById,
    storyData,
    customPairs,
    currentMissionId,
    markStorySeen,
  } = useContext(GameContext);
  const { rows: collectedRows } = useMissionStories();
  const [currentStories, setCurrentStories] = useState([]);
  const [fullScreenIndex, setFullScreenIndex] = useState(null); // 控制哪張圖全螢幕

  const currentMission = getMissionById(currentMissionId);

  useEffect(() => {
    if (!currentMission) {
      // 沒有關卡＝玩家在封面上（GameStart），不是「還沒載好」。
      // **要清掉，不能只 return**——直接 return 會讓這一頁停在上一關，
      // 於是從第三關回封面時這裡還列著第三關的東西。
      // 今天踩不到是因為 currentMissionId 從來不會被清空；GameStart 一落地就會踩到。
      setCurrentStories([]);
      setFullScreenIndex(null);
      return;
    }
    if (!Array.isArray(storyData)) {
      console.log('storyData 不是有效的數組！');
      return;
    }
    const stories = storyData.filter(
      (row) => row.missionId === currentMission.id
    );
    setCurrentStories(stories);
  }, [currentMission, storyData]);

  // 人就在這一頁，收進來的都看得到了——導覽列的紅點歸零。
  //
  // **要等 collectedRows 有東西才標記。** 還沒解完（或資料還沒載好）時它是空的，
  // 那時候標記的話，等這一關真的解完，紅點一次都不會亮
  //（提示頁踩過同一種順序問題，見 HintPage 的 ready）。
  useEffect(() => {
    if (currentMission && collectedRows.length > 0) markStorySeen(currentMission.id);
    // markStorySeen 每次 render 都是新函式，放進 deps 會讓這條 effect 每次都重跑。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMission, collectedRows]);

  const items = useMemo(
    () => [
      ...currentStories.map((row) => ({ kind: 'story', row })),
      ...collectedRows.map((row) => ({ kind: row.model.trim(), row })),
    ],
    [currentStories, collectedRows]
  );

  const toggle = (index) =>
    setFullScreenIndex(fullScreenIndex === index ? null : index);

  return (
    <PageContainer>
      <PageTitleText title="故事" />
      <ContentList
        items={items}
        renderItem={({ kind, row }, index) =>
          kind === 'Article' ? (
            <ArticleCard
              key={index}
              row={row}
              text={articleTextOf(row, customPairs)}
              isFullScreen={fullScreenIndex === index}
              showZoomButton={fullScreenIndex === null}
              onToggle={() => toggle(index)}
            />
          ) : (
            // story 表的圖讀 img；rundown 的 Img 讀 backgroundImg——
            // 都是它們原本就在讀的欄位（ImgModel 也是讀 backgroundImg）
            <ZoomableImage
              key={index}
              src={getImg(kind === 'story' ? row.img : row.backgroundImg)}
              alt={`Image ${index + 1}`}
              title={row.title}
              isFullScreen={fullScreenIndex === index}
              showZoomButton={fullScreenIndex === null}
              onToggle={() => toggle(index)}
            />
          )
        }
        emptyText="No stories available"
      />
    </PageContainer>
  );
};

export default StoryPage;
