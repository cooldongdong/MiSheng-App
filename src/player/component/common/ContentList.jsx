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
