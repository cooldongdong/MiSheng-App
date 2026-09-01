import { Stack } from '@mui/material';
import PropTypes from 'prop-types';

const ContentList = ({
  items,
  renderItem,
  spacing = 2,
  emptyText = 'No items available',
  sx = {},
}) => {
  return (
    <Stack
      spacing={spacing}
      sx={{
        overflowY: 'auto',
        // 外層 swipe 容器是 touch-action:none（垂直拖曳被翻頁接管），
        // 可捲區要自己把垂直捲動要回來，否則觸控裝置上捲不動
        touchAction: 'pan-y',
        maxHeight: '100%',
        flex: 1,
        p: '8%',
        pb: '13%',
        m: '-8%',
        mt: '-3%',
        ...sx, // 允許外部覆寫樣式
      }}
    >
      {Array.isArray(items) && items.length > 0 ? (
        items.map((item, index) => renderItem(item, index))
      ) : (
        <p>{emptyText}</p>
      )}
    </Stack>
  );
};

ContentList.propTypes = {
  items: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  spacing: PropTypes.number,
  emptyText:PropTypes.string,
  sx: PropTypes.object,
};

export default ContentList;
