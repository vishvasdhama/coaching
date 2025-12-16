const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Allow overriding the database filename via environment variable
// e.g. DATABASE_FILE=./server/other-db.db node server.js
const defaultDbPath = path.join(__dirname, 'coaching-center.db');
const dbFile = process.env.DATABASE_FILE ? process.env.DATABASE_FILE : defaultDbPath;

console.log(`Using SQLite database file: ${dbFile}`);

const db = new sqlite3.Database(dbFile);

// Create students table if not exists
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY,
      name TEXT,
      class TEXT,
      username TEXT UNIQUE,
      password TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      status TEXT,
      createdAt TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY,
      title TEXT,
      content TEXT,
      date TEXT,
      priority TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_materials (
      id INTEGER PRIMARY KEY,
      title TEXT,
      subject TEXT,
      class TEXT,
      type TEXT,
      description TEXT,
      fileName TEXT,
      fileSize TEXT,
      downloads INTEGER,
      uploadDate TEXT,
      link TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      class TEXT,
      present INTEGER,
      absent INTEGER,
      total INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      k TEXT PRIMARY KEY,
      v TEXT
    )
  `);

  // Seed data from JSON file if tables are empty
  try {
    const fs = require('fs');
    const seedPath = path.join(__dirname, 'seed_data.json');
    if (fs.existsSync(seedPath)) {
      const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

      // Insert admin if not exists
      db.get('SELECT COUNT(*) as cnt FROM admin', (err, row) => {
        if (!err && row.cnt === 0 && seed.admin) {
          const stmt = db.prepare('INSERT INTO admin (username, password) VALUES (?, ?)');
          stmt.run(seed.admin.username, seed.admin.password);
          stmt.finalize();
        }
      });

      // Insert students if not exists
      db.get('SELECT COUNT(*) as cnt FROM students', (err, row) => {
        if (!err && row.cnt === 0 && Array.isArray(seed.students)) {
          const stmt = db.prepare('INSERT INTO students (id, name, class, username, password, phone, email, address, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          seed.students.forEach(s => {
            stmt.run(s.id, s.name, s.class, s.username, s.password, s.phone, s.email, s.address, s.status, s.createdAt);
          });
          stmt.finalize();
        }
      });

      // Insert announcements if not exists
      db.get('SELECT COUNT(*) as cnt FROM announcements', (err, row) => {
        if (!err && row.cnt === 0 && Array.isArray(seed.announcements)) {
          const stmt = db.prepare('INSERT INTO announcements (id, title, content, date, priority) VALUES (?, ?, ?, ?, ?)');
          seed.announcements.forEach(a => {
            stmt.run(a.id, a.title, a.content, a.date, a.priority);
          });
          stmt.finalize();
        }
      });

      // Insert study materials if not exists
      db.get('SELECT COUNT(*) as cnt FROM study_materials', (err, row) => {
        if (!err && row.cnt === 0 && Array.isArray(seed.studyMaterials)) {
          const stmt = db.prepare('INSERT INTO study_materials (id, title, subject, class, type, description, fileName, fileSize, downloads, uploadDate, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          seed.studyMaterials.forEach(m => {
            stmt.run(m.id, m.title, m.subject, m.class, m.type, m.description, m.fileName, m.fileSize, m.downloads || 0, m.uploadDate, m.link || null);
          });
          stmt.finalize();
        }
      });

      // Insert settings
      db.get('SELECT COUNT(*) as cnt FROM settings', (err, row) => {
        if (!err && row.cnt === 0 && seed.settings) {
          const stmt = db.prepare('INSERT INTO settings (k, v) VALUES (?, ?)');
          Object.keys(seed.settings).forEach(k => {
            stmt.run(k, String(seed.settings[k]));
          });
          stmt.finalize();
        }
      });
    }
  } catch (e) {
    console.error('Seeding failed:', e.message);
  }
});

module.exports = db;