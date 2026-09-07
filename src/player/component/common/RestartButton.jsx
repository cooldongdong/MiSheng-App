import PropTypes from 'prop-types';
import { useContext } from 'react';
import { GameContext } from '../../store/game-context';
import ConfirmDialog from './ConfirmDialog';

// 清掉這個遊戲的存檔並重新開始。
//
// 只給 /demo。/create 是 previewMode——進度從頭到尾只活在記憶體裡，localStorage 裡
// 根本沒有這個遊戲的東西；按下去唯一的效果是整頁 reload，把剛載入的試算表也一起
// 丟掉。那邊真正的「重來」是左欄的「換一份／重新讀取」。
//
// 不給 confirmOnEnter：清存檔不可逆，應該要求真的伸手點那一下。
const RestartButton = ({ open, onClose }) => {
  const { gameId, clearGameData } = useContext(GameContext);

  if (!gameId) return null;

  return (
    <>
      <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={() => clearGameData(gameId)}
        title="確定重新開始？"
        confirmText={`會清掉「${gameId}」的進度（走到哪一列、關卡狀態、已解鎖的提示）並重新整理頁面。`}
      />
    </>
  );
};

RestartButton.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RestartButton;
