const fs = require('fs');
const path = require('path');
const db = require('./database');

const outDir = path.join(__dirname, 'exports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',') + '\n';
  const lines = rows.map(r => keys.map(k => `"${(r[k] === null || r[k] === undefined) ? '' : String(r[k]).replace(/"/g, '""')}"`).join(','));
  return header + lines.join('\n');
}

function exportTable(table, outName) {
  db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
    if (err) return console.error(`Error reading ${table}:`, err.message);

    const jsonPath = path.join(outDir, `${outName}.json`);
    const csvPath = path.join(outDir, `${outName}.csv`);

    fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf8');
    fs.writeFileSync(csvPath, toCsv(rows), 'utf8');

    console.log(`Exported ${table} -> ${jsonPath}, ${csvPath}`);
  });
}

exportTable('admin', 'admin');
exportTable('students', 'students');
