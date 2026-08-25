import { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { buildGamePack, downloadBlob } from './exportGamePack';

// 「匯出遊戲包」：把外連圖片抓下來、改寫表格、打包成可自架的資料夾。
//
// 只在資料來自 Google 試算表時出現——本機資料夾那條路的圖本來就在使用者手上，
// 表格填的也已經是檔名，沒有東西需要被換掉。
const ExportPackButton = ({ tables, fullWidth = false, size = 'large' }) => {
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
      </Button>

      {busy && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant={progress?.total ? 'determinate' : 'indeterminate'}
            value={pct}
          />
          {progress?.total > 0 && (
            <Typography variant="caption" sx={{ color: '#78909c' }}>
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
              ? '這份表格沒有外連圖片網址，只打包了 7 張表。'
              : `${result.report.ok} / ${result.report.total} 張圖抓到了，表格裡的網址已換成檔名。`}
          </Typography>

          {result.report.failed.length > 0 && (
            <Box sx={{ mt: 0.75 }}>
              <Typography variant="caption" component="div">
                有 {result.report.failed.length} 張抓不到，那幾格維持原本的連結：
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

          <Typography variant="caption" component="div" sx={{ mt: 0.5, color: '#78909c' }}>
            解開後整個資料夾丟進 src/gameFile/ 就能自己 build。「圖片對照.csv」記著每個
            新檔名對應原本哪條連結，想換回原圖可以照著對。
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
  fullWidth: PropTypes.bool,
  size: PropTypes.string,
};

export default ExportPackButton;
