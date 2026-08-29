import PropTypes from 'prop-types';
function CharacterLayer(props) {
  // 沒有立繪（欄位空、或即時轉化的圖片網址抓不到）就不畫，
  // 免得留一個破圖 icon 卡在畫面中央
  if (!props.src) return null;

  return (
    <img
      src={props.src}
      style={{
        objectFit: 'contain',
        objectPosition: 'top',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden';
      }}
    ></img>
  );
}

CharacterLayer.propTypes = {
  src: PropTypes.string,
};

export default CharacterLayer;
