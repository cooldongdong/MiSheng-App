import PropTypes from 'prop-types';
import { Alert, Box, Chip, Divider, Typography } from '@mui/material';
import { REQUIRED_TABLES } from '../validator/validateGame';

// 把 issues 依「表」分組印出來（跟 CLI 版 scripts/validate.js 同一套排版邏輯）
const IssueGroup = ({ list }) => {
  const byTable = {};
  for (const it of list) (byTable[it.table] ||= []).push(it);

  return (
    <Box sx={{ mt: 1 }}>
      {REQUIRED_TABLES.filter((type) => byTable[type]?.length).map((type) => (
        <Box key={type} sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            【{type}】
          </Typography>
          {byTable[type].map((it, i) => (
            <Typography key={i} variant="body2" sx={{ pl: 2 }}>
              {it.row ? `第 ${it.row} 列` : '整表'}
              {it.column ? ` · ${it.column}` : ''}：{it.message}
            </Typography>
          ))}
        </Box>
      ))}
    </Box>
  );
};

IssueGroup.propTypes = { list: PropTypes.array.isRequired };

const ValidationReport = ({ issues }) => {
  const errors = issues.filter((it) => it.level === 'error');
  const warns = issues.filter((it) => it.level === 'warn');

  if (!errors.length && !warns.length) {
    return <Alert severity="success">通過：沒有發現問題，可以生成遊戲。</Alert>;
  }

  return (
    <Box>
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            錯誤 {errors.length} 個（需修正才能生成）
          </Typography>
          <IssueGroup list={errors} />
        </Alert>
      )}

      {warns.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            提醒 {warns.length} 個（不影響生成，建議檢查）
          </Typography>
          <IssueGroup list={warns} />
        </Alert>
      )}

      <Divider sx={{ my: 1 }} />
      <Chip size="small" label="列號為試算表列號（表頭是第 1 列）" />
    </Box>
  );
};

ValidationReport.propTypes = { issues: PropTypes.array.isRequired };

export default ValidationReport;
