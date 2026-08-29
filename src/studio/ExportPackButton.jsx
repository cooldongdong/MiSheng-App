import { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Button, Chip, LinearProgress, Typography } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { buildGamePack, downloadBlob } from './exportGamePack';

// 兩種來源分開講，使用者才知道哪些是從雲端抓的、哪些是他自己給的。
// 全部失敗時兩個都是 0，這時不加後綴，只留「0 / N 張圖進到包裡」。
const breakdown = ({ downloaded, fromFolder }) => {
  const parts = [
    downloaded > 0 && `${downloaded} 張從網址下載（表格裡的網址已換成檔名）`,
    fromFolder > 0 && `${fromFolder} 張來自你選的資料夾（檔名沒有動）`,
  ].filter(Boolean);
  return parts.length ? `：${parts.join('、')}` : '';
};

// 「匯出遊戲包」：把外連圖片抓下來、改寫表格、打包成可自架的資料夾。
//
// 只在資料來自 Google 試算表時出現——本機資料夾那條路的圖本來就在使用者手上，
// 表格填的也已經是檔名，沒有東西需要被換掉。
const ExportPackButton = ({ tables, imgMap = null, fullWidth = false, size = 'large' }) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const { blob, folder, report } = await buildGamePack(tables, {
        imgMap,
        onProgress: ({ done, total }) => setProgress({ done, total }),
      });
      downloadBlob(blob, `${folder}.zip`);
      setResult({ folder, report });
    } catch (err) {
      setError(err.message || '匯出失敗');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const pct =
    progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <Button
        fullWidth={fullWidth}
        size={size}
        variant="outlined"
        startIcon={<DownloadRoundedIcon />}
        disabled={busy}
        onClick={handleExport}
      >
        {busy ? '正在抓圖片…' : '匯出遊戲包'}
        {/* 標 beta：這條路吃的是 Google 的限速與權限設定，不是我們能保證的東西。
            使用者知道它可能中途失敗，跟事後才發現包裡缺圖，是兩種心情。 */}
        {!busy && (
          <Chip
            component="span"
            label="beta"
            size="small"
            sx={{
              ml: 0.75,
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              // Button 的 text-transform: uppercase 會滲進來，把 beta 變成 BETA
              textTransform: 'none',
              bgcolor: 'action.hover',
              color: 'text.disabled',
              '& .MuiChip-label': { px: 0.6 },
            }}
          />
        )}
      </Button>

      {busy && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant={progress?.total ? 'determinate' : 'indeterminate'}
            value={pct}
          />
          {progress?.total > 0 && (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {progress.done} / {progress.total} 張
            </Typography>
          )}
        </Box>
      )}

      {result && (
        <Alert
          severity={result.report.failed.length ? 'warning' : 'success'}
          sx={{ mt: 1.5 }}
          onClose={() => setResult(null)}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            已下載 {result.folder}.zip
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
            {result.report.total === 0
              ? '這份表格沒有填任何圖片，只打包了 7 張表。'
              : `${result.report.ok} / ${result.report.total} 張圖進到包裡${breakdown(
                  result.report
                )}。`}
          </Typography>

          {result.report.failed.length > 0 && (
            <Box sx={{ mt: 0.75 }}>
              {/* 措辭要對兩種來源都成立：外連是「抓不到」、本機是「資料夾裡沒有」，
                  而且只有外連那種格子裡才有「連結」可以維持 */}
              <Typography variant="caption" component="div">
                有 {result.report.failed.length} 張沒有進到包裡（表格裡那幾格都沒有動）：
              </Typography>
              {/* 原因直接列在畫面上。塞進 zip 裡的收據等於沒說——
                  要先解壓縮、開 CSV 才知道為什麼，那時人已經在猜了 */}
              <Box
                component="ul"
                sx={{ m: 0, mt: 0.5, pl: 2, maxHeight: 160, overflow: 'auto' }}
              >
                {result.report.failed.map((f) => (
                  <Typography
                    key={f.url}
                    component="li"
                    variant="caption"
                    sx={{ display: 'list-item', wordBreak: 'break-all' }}
                  >
                    <b>{f.where}</b>：{f.error}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          <Typography variant="caption" component="div" sx={{ mt: 0.5, color: 'text.disabled' }}>
            解開後整個資料夾丟進 src/gameFile/ 就能自己 build。包裡的「圖片對照.csv」列出
            每張圖從哪來、用在哪幾格，想核對這包齊不齊、或把下載的圖換回原圖，都看那張表。
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

ExportPackButton.propTypes = {
  tables: PropTypes.object.isRequired,
  imgMap: PropTypes.instanceOf(Map),
  fullWidth: PropTypes.bool,
  size: PropTypes.string,
};

export default ExportPackButton;
