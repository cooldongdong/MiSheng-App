import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import ContentList from '../common/ContentList';
import ZoomableImage from '../common/ZoomableImage';

const StoryPage = () => {
  const { getImg, getMissionById, storyData, currentMissionId } =
    useContext(GameContext);
  const [currentStories, setCurrentStories] = useState([]);
  const [fullScreenIndex, setFullScreenIndex] = useState(null); // 控制哪張圖全螢幕

  const currentMission = getMissionById(currentMissionId);

  useEffect(() => {
    if (!currentMission) {
      console.log('還沒有 currentMission！');
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

  return (
    <PageContainer>
      <PageTitleText title="故事" />
      <ContentList
        items={currentStories}
        renderItem={(story, index) => (
          <ZoomableImage
            key={index}
            src={getImg(story.img)}
            alt={`Image ${index + 1}`}
            title={story.title}
            isFullScreen={fullScreenIndex === index}
            showZoomButton={fullScreenIndex === null}
            onToggle={() =>
              setFullScreenIndex(fullScreenIndex === index ? null : index)
            }
          />
        )}
        emptyText="No stories available"
      />
    </PageContainer>
  );
};

export default StoryPage;
