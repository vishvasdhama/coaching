const fs = require('fs');
const path = require('path');

// Usage: node migrate_db.js target.db
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node migrate_db.js <target-db-file>');
  process.exit(1);
}

const target = args[0];
const defaultSource = path.join(__dirname, 'coaching-center.db');
const source = process.env.DATABASE_FILE ? process.env.DATABASE_FILE : defaultSource;

console.log(`Source DB: ${source}`);
console.log(`Target DB: ${target}`);

try {
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  console.log('Database migrated successfully.');
} catch (err) {
  if (err.code === 'EEXIST') {
    console.error('Target file already exists. Choose a different target or remove the existing file.');
  } else if (err.code === 'ENOENT') {
    console.error('Source DB not found. If you are creating a new DB, you can copy an empty template or run the server to create the default DB.');
  } else {
    console.error('Migration failed:', err.message);
  }
  process.exit(1);
}
