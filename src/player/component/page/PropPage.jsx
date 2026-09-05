import { useContext, useEffect, useState } from 'react';
import { GameContext } from '../../store/game-context';
import PageContainer from '../common/PageContainer';
import PageTitleText from '../common/PageTitleText';
import ContentList from '../common/ContentList';
import ZoomableImage from '../common/ZoomableImage';
import Wheel from '../common/Wheel';
import CameraOverlay from '../common/CameraOverlay';

const PropPage = () => {
  const { getImg, getMissionById, propData, currentMissionId } =
    useContext(GameContext);
  const [currentProps, setCurrentProps] = useState([]);
  const [fullScreenIndex, setFullScreenIndex] = useState(null); // 控制哪張圖全螢幕

  const currentMission = getMissionById(currentMissionId);

  useEffect(() => {
    if (!currentMission) {
      // 沒有關卡＝玩家在封面上（GameStart），不是「還沒載好」。
      // **要清掉，不能只 return**——直接 return 會讓這一頁停在上一關，
      // 於是從第三關回封面時這裡還列著第三關的東西。
      // 今天踩不到是因為 currentMissionId 從來不會被清空；GameStart 一落地就會踩到。
      setCurrentProps([]);
      setFullScreenIndex(null);
      return;
    }
    if (!Array.isArray(propData)) {
      console.log('propData 不是有效的數組！');
      return;
    }
    const props = propData.filter((row) => row.missionId === currentMission.id);
    setCurrentProps(props);
  }, [currentMission, propData]);

  return (
    <PageContainer>
      <PageTitleText title="道具" />
      <ContentList
        items={currentProps}
        renderItem={(prop, index) =>
          prop.type === 'Img' ? (
            <ZoomableImage
              key={index}
              src={getImg(prop.img)}
              alt={`Image ${index + 1}`}
              title={prop.title}
              isFullScreen={fullScreenIndex === index}
              showZoomButton={fullScreenIndex === null}
              onToggle={() =>
                setFullScreenIndex(fullScreenIndex === index ? null : index)
              }
            />
          ) : prop.type === 'Camera' ? (
            <CameraOverlay
              key={index}
              prop={prop}
              isFullScreen={fullScreenIndex === index}
              showZoomButton={fullScreenIndex === null}
              onToggle={() =>
                setFullScreenIndex(fullScreenIndex === index ? null : index)
              }
            />
          ) : prop.type === 'Wheel' ? (
            <Wheel
              key={index}
              prop={prop}
              isFullScreen={fullScreenIndex === index}
              showZoomButton={fullScreenIndex === null}
              onToggle={() =>
                setFullScreenIndex(fullScreenIndex === index ? null : index)
              }
            />
          ) : null
        }
        emptyText="No props available"
      />
    </PageContainer>
  );
};

export default PropPage;
