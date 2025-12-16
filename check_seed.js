const db = require('./database');

const tables = ['admin','students','announcements','study_materials','attendance_records','settings'];

db.serialize(() => {
  tables.forEach(t => {
    db.get(`SELECT COUNT(*) as c FROM ${t}`, (err, row) => {
      if (err) {
        console.error(t, 'ERR', err.message);
      } else {
        console.log(`${t}: ${row.c}`);
      }
    });
  });
});
