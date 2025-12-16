const http = require('http');
const url = require('url');
const db = require('./database');

// Allow overriding port via environment (useful for hosting)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

function sendJson(res, status, obj) {
  const data = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    // Allow methods used by the frontend (GET, POST, PUT, DELETE, OPTIONS)
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(data);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  // Simple request logging for debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${parsed.pathname}`);
  if (req.method === 'OPTIONS') {
    // CORS preflight
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (parsed.pathname === '/api/students' && req.method === 'GET') {
    db.all('SELECT * FROM students', [], (err, rows) => {
      if (err) return sendJson(res, 500, { error: err.message });
      sendJson(res, 200, rows);
    });
    return;
  }

  if (parsed.pathname === '/api/students' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { name, class: studentClass, username, password, phone, email, address } = payload;
        db.run(
          `INSERT INTO students (name, class, username, password, phone, email, address, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', date('now'))`,
          [name, studentClass, username, password, phone, email, address],
          function(err) {
            if (err) return sendJson(res, 500, { error: err.message });
            sendJson(res, 200, { id: this.lastID });
          }
        );
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // Delete student by id: DELETE /api/students/:id
  if (parsed.pathname.startsWith('/api/students/') && req.method === 'DELETE') {
    const parts = parsed.pathname.split('/');
    const id = parseInt(parts[parts.length - 1], 10);
    if (Number.isNaN(id)) return sendJson(res, 400, { error: 'Invalid student id' });
    db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
      if (err) return sendJson(res, 500, { error: err.message });
      if (this.changes === 0) return sendJson(res, 404, { error: 'Student not found' });
      sendJson(res, 200, { success: true });
    });
    return;
  }

  // Update student by id: PUT /api/students/:id
  if (parsed.pathname.startsWith('/api/students/') && req.method === 'PUT') {
    const parts = parsed.pathname.split('/');
    const id = parseInt(parts[parts.length - 1], 10);
    if (Number.isNaN(id)) return sendJson(res, 400, { error: 'Invalid student id' });
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { name, class: studentClass, username, password, phone, email, address, status } = payload;
        db.run(
          `UPDATE students SET name = ?, class = ?, username = ?, password = ?, phone = ?, email = ?, address = ?, status = ? WHERE id = ?`,
          [name, studentClass, username, password, phone, email, address, status || 'Active', id],
          function(err) {
            if (err) return sendJson(res, 500, { error: err.message });
            if (this.changes === 0) return sendJson(res, 404, { error: 'Student not found' });
            // Return updated record
            db.get('SELECT * FROM students WHERE id = ?', [id], (err2, row) => {
              if (err2) return sendJson(res, 500, { error: err2.message });
              sendJson(res, 200, row || {});
            });
          }
        );
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // Student login - validate username/password against students table
  if (parsed.pathname === '/api/students/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { username, password } = payload;
        if (!username || !password) return sendJson(res, 400, { error: 'Missing username or password' });

        db.get('SELECT * FROM students WHERE username = ? AND password = ?', [username, password], (err, row) => {
          if (err) return sendJson(res, 500, { error: err.message });
          if (!row) return sendJson(res, 401, { error: 'Invalid credentials' });
          // Update lastLogin timestamp
          db.run('UPDATE students SET lastLogin = ? WHERE id = ?', [new Date().toISOString(), row.id]);
          sendJson(res, 200, { id: row.id, username: row.username, name: row.name || row.username });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // Admin login
  if (parsed.pathname === '/api/admin/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { username, password } = payload;
        if (!username || !password) return sendJson(res, 400, { error: 'Missing username or password' });

        db.get('SELECT id, username FROM admin WHERE username = ? AND password = ?', [username, password], (err, row) => {
          if (err) return sendJson(res, 500, { error: err.message });
          if (!row) return sendJson(res, 401, { error: 'Invalid credentials' });
          sendJson(res, 200, { id: row.id, username: row.username, name: 'Administrator' });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // Announcements endpoints
  if (parsed.pathname === '/api/announcements' && req.method === 'GET') {
    db.all('SELECT * FROM announcements ORDER BY date DESC, id DESC', [], (err, rows) => {
      if (err) return sendJson(res, 500, { error: err.message });
      sendJson(res, 200, rows);
    });
    return;
  }

  if (parsed.pathname === '/api/announcements' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { title, content, date, priority } = payload;
        db.run('INSERT INTO announcements (title, content, date, priority) VALUES (?, ?, ?, ?)', [title, content, date, priority || 'normal'], function(err) {
          if (err) return sendJson(res, 500, { error: err.message });
          sendJson(res, 200, { id: this.lastID });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (parsed.pathname.startsWith('/api/announcements/') && req.method === 'DELETE') {
    const parts = parsed.pathname.split('/');
    const id = parseInt(parts[parts.length - 1], 10);
    if (Number.isNaN(id)) return sendJson(res, 400, { error: 'Invalid announcement id' });
    db.run('DELETE FROM announcements WHERE id = ?', [id], function(err) {
      if (err) return sendJson(res, 500, { error: err.message });
      if (this.changes === 0) return sendJson(res, 404, { error: 'Announcement not found' });
      sendJson(res, 200, { success: true });
    });
    return;
  }

  // Study materials endpoints
  if (parsed.pathname === '/api/study_materials' && req.method === 'GET') {
    db.all('SELECT * FROM study_materials ORDER BY uploadDate DESC, id DESC', [], (err, rows) => {
      if (err) return sendJson(res, 500, { error: err.message });
      sendJson(res, 200, rows);
    });
    return;
  }

  if (parsed.pathname === '/api/study_materials' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { title, subject, class: cls, type, description, fileName, fileSize, link } = payload;
        db.run('INSERT INTO study_materials (title, subject, class, type, description, fileName, fileSize, downloads, uploadDate, link) VALUES (?, ?, ?, ?, ?, ?, ?, 0, date(\'now\'), ?)', [title, subject, cls, type, description, fileName, fileSize || null, link || null], function(err) {
          if (err) return sendJson(res, 500, { error: err.message });
          sendJson(res, 200, { id: this.lastID });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (parsed.pathname.startsWith('/api/study_materials/') && req.method === 'DELETE') {
    const parts = parsed.pathname.split('/');
    const id = parseInt(parts[parts.length - 1], 10);
    if (Number.isNaN(id)) return sendJson(res, 400, { error: 'Invalid material id' });
    db.run('DELETE FROM study_materials WHERE id = ?', [id], function(err) {
      if (err) return sendJson(res, 500, { error: err.message });
      if (this.changes === 0) return sendJson(res, 404, { error: 'Material not found' });
      sendJson(res, 200, { success: true });
    });
    return;
  }

  // Attendance summary endpoints (store aggregated records)
  if (parsed.pathname === '/api/attendance_records' && req.method === 'GET') {
    db.all('SELECT * FROM attendance_records ORDER BY date DESC, id DESC', [], (err, rows) => {
      if (err) return sendJson(res, 500, { error: err.message });
      sendJson(res, 200, rows);
    });
    return;
  }

  if (parsed.pathname === '/api/attendance_records' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { date, class: cls, present, absent, total } = payload;
        db.run('INSERT INTO attendance_records (date, class, present, absent, total) VALUES (?, ?, ?, ?, ?)', [date, cls, present || 0, absent || 0, total || 0], function(err) {
          if (err) return sendJson(res, 500, { error: err.message });
          sendJson(res, 200, { id: this.lastID });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // Fallback
  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Simple server running on ${HOST}:${PORT}`);
});
