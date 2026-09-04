// csvLoader.js
import Papa from 'papaparse';
import { withRowKeys } from '../../shared/rowKey';

// Load CSV data
export const loadCSVData = async (csvFile) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFile, {
      header: true,
      download: false,
      // 每一列在這裡就掛上內部身分（見 rowKey）。三條載入路徑
      // （/create、/demo、獨立播放器）都經過這裡，所以掛在這裡就一次涵蓋全部
      // ——而且下游拿到的資料從第一刻起就有身分，不必各自處理「還沒掛好」的狀態。
      complete: (result) => resolve(withRowKeys(result.data)),
      error: (error) => reject(error),
    });
  });
};
