import ContentList from '../common/ContentList';
import MissionItem from './MissionItem';
import PropTypes from 'prop-types';

const MissionList = ({
  missions,
  currentMissionId,
  onMissionSelect,
  onMultiClick,
}) => {
  return (
    <ContentList
      items={missions}
      renderItem={(mission) => (
        <MissionItem
          key={mission.id}
          mission={mission}
          isActive={mission.id === currentMissionId}
          onSelect={() =>
            onMissionSelect(mission.id, mission.subtitle || mission.title)
          }
          onMultiClick={onMultiClick}
        />
      )}
      emptyText="No missions available"
    />
  );
};

MissionList.propTypes = {
  missions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      subtitle: PropTypes.string,
      status: PropTypes.oneOf(['solving', 'complete', 'incomplete', '']),
      backgroundImg: PropTypes.string,
    })
  ),
  currentMissionId: PropTypes.string.isRequired,
  onMissionSelect: PropTypes.func.isRequired,
  onMultiClick: PropTypes.func,
};

export default MissionList;
