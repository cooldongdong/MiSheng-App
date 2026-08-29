// validate.js
// misheng CSV validator CLI
// 用法：node scripts/validate.js <遊戲資料夾路徑>
//   例：node scripts/validate.js src/gameFile/demo
// 或： npm run validate -- src/gameFile/demo
//
// exit code：0＝通過、1＝有問題、2＝用法/檔案錯誤

import fs from 'node:fs';
import path from 'node:path';
import Papa from 'papaparse';
import { validateGame, REQUIRED_TABLES } from '../src/shared/validator/validateGame.js';

const gameDir = process.argv[2];
if (!gameDir) {
  console.error('用法：node scripts/validate.js <遊戲資料夾路徑>');
  console.error('例：  node scripts/validate.js src/gameFile/demo');
  process.exit(2);
}
if (!fs.existsSync(gameDir) || !fs.statSync(gameDir).isDirectory()) {
  console.error(`❌ 找不到資料夾：${gameDir}`);
  process.exit(2);
}

const folderName = path.basename(gameDir);

const parseCsv = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const result = Papa.parse(raw, { header: true, skipEmptyLines: false });
  return { fields: result.meta.fields || [], rows: result.data };
};

// 依 misheng 命名規則 `{資料夾} - {type}.csv` 找 7 張表
const tables = {};
for (const type of REQUIRED_TABLES) {
  const filePath = path.join(gameDir, `${folderName} - ${type}.csv`);
  tables[type] = fs.existsSync(filePath) ? parseCsv(filePath) : null;
}

const issues = validateGame(tables);
const errors = issues.filter((it) => it.level === 'error');
const warns = issues.filter((it) => it.level === 'warn');

console.log(`\n🔍 驗證遊戲：${folderName}（${gameDir}）\n`);

// 依表分組印出一組 issue
const printGroup = (list) => {
  const byTable = {};
  for (const it of list) (byTable[it.table] ||= []).push(it);
  for (const type of REQUIRED_TABLES) {
    const rows = byTable[type];
    if (!rows || !rows.length) continue;
    console.log(`  【${type}】`);
    for (const it of rows) {
      const loc = it.row ? `第 ${it.row} 列` : '整表';
      const col = it.column ? ` · ${it.column}` : '';
      console.log(`    ${loc}${col}：${it.message}`);
    }
  }
  console.log('');
};

if (errors.length === 0 && warns.length === 0) {
  console.log('✅ 通過：沒有發現問題，可以生成遊戲。\n');
  process.exit(0);
}

if (errors.length) {
  console.log(`❌ 錯誤 ${errors.length} 個（需修正才能生成）：\n`);
  printGroup(errors);
}
if (warns.length) {
  console.log(`⚠️  提醒 ${warns.length} 個（不影響生成，建議檢查）：\n`);
  printGroup(warns);
}

console.log('（列號為試算表列號）\n');

if (errors.length) process.exit(1);
console.log('✅ 沒有錯誤，可以生成遊戲（上面的提醒請斟酌）。\n');
process.exit(0);
