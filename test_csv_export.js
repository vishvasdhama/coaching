const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function run() {
  const outDir = path.join(__dirname, '..', 'test-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const html = `<!doctype html><html><head></head><body>
    <select id="attendanceFilterClass"></select>
    <input id="attendanceFilterMonth" type="month">
    <select id="marksFilterClass"></select>
    <select id="marksFilterSubject"></select>
    <input id="marksFilterMonth" type="month">
  </body></html>`;

  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const window = dom.window;
  const document = window.document;

  // Prevent errors from stopping execution: stub alert/confirm/prompt and add global error handlers
  window.alert = function(msg) { console.log('alert:', msg); };
  window.confirm = function() { return true; };
  window.prompt = function() { return null; };
  window.console = console;
  window.addEventListener('error', (e) => {
    console.error('Window error:', e.message || e);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason || e);
  });

  // Stub Blob & URL.createObjectURL and anchor click to capture blob content
  window._blobStore = {};
  window.Blob = function(parts, opts) {
    this._parts = parts;
    this._type = opts && opts.type;
  };
  window.URL = window.URL || {};
  window.URL.createObjectURL = function(blob) {
    const id = 'blob://' + Math.random().toString(36).slice(2);
    window._blobStore[id] = blob;
    return id;
  };
  window.URL.revokeObjectURL = function(id) { delete window._blobStore[id]; };

  // Override anchor click to write file on disk
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName) {
    const el = originalCreateElement(tagName);
    if (tagName.toLowerCase() === 'a') {
      el.click = function() {
        try {
          const href = this.href || '';
          const filename = this.download || ('download_' + Date.now() + '.csv');
          if (href.startsWith('blob://') && window._blobStore[href]) {
            const blob = window._blobStore[href];
            // blob._parts may contain strings
            const content = blob._parts.map(p => typeof p === 'string' ? p : (p && p.toString ? p.toString() : '')).join('');
            const filePath = path.join(outDir, filename);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('WROTE', filePath);
          } else if (href.startsWith('data:')) {
            // data URI - try to decode
            const comma = href.indexOf(',');
            const data = href.slice(comma + 1);
            const decoded = decodeURIComponent(data);
            const filePath = path.join(outDir, filename);
            fs.writeFileSync(filePath, decoded, 'utf8');
            console.log('WROTE', filePath);
          } else {
            console.log('Anchor click with href', href);
          }
        } catch (err) {
          console.error('Anchor click handler error', err);
        }
      };
    }
    return el;
  };

  // Keep a fallback simple download helper too
  window.downloadCSV = function(filename, csv) {
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, csv, 'utf8');
    console.log('WROTE', filePath);
  };
  window.downloadCSV_student = window.downloadCSV;

  // Populate sample localStorage students
  const sampleStudents = [
    { id: '1001', name: 'Aman', class: '9th', attendance: [ { date: '2025-10-01', status: 'Present', remarks: 'On time' }, { date: '2025-10-02', status: 'Absent', remarks: 'Sick' } ], testResults: [ { testName: 'Unit1', subject: 'Math', date: '2025-09-30', marks: 45, maxMarks: 50, remarks: '' } ] },
    { id: '1002', name: 'Sneha', class: '9th', attendance: [ { date: '2025-10-01', status: 'Absent', remarks: '' } ], testResults: [] }
  ];

  window.localStorage.setItem('students', JSON.stringify(sampleStudents));
  window.localStorage.setItem('currentStudent', JSON.stringify(sampleStudents[0]));

  // Load project scripts into the JSDOM window
  const adminJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'admin.js'), 'utf8');
  const studentJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'student.js'), 'utf8');

  const scriptAdmin = document.createElement('script');
  scriptAdmin.textContent = adminJs;
  document.body.appendChild(scriptAdmin);

  const scriptStudent = document.createElement('script');
  scriptStudent.textContent = studentJs;
  document.body.appendChild(scriptStudent);

  // Allow scripts to run
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // Call admin export for class 9th
    if (typeof window.exportAttendanceCSV === 'function') {
      window.exportAttendanceCSV('9th');
    } else if (typeof window.exportAttendanceCsv === 'function') {
      window.exportAttendanceCsv();
    }

    if (typeof window.exportMarksCSV === 'function') {
      window.exportMarksCSV('9th');
    } else if (typeof window.exportMarksCsv === 'function') {
      window.exportMarksCsv();
    }

    // Call student exports
    if (typeof window.exportMyAttendanceCSV === 'function') {
      window.exportMyAttendanceCSV();
    }
    if (typeof window.exportMyMarksCSV === 'function') {
      window.exportMyMarksCSV();
    }

    console.log('Test exports completed. See test-output/ for files.');
  } catch (err) {
    console.error('Error running exports in jsdom context:', err);
  }

  // Close dom
  dom.window.close();
})();
