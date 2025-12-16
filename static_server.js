const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = path.join(__dirname, '..');

function contentType(p) {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  const safeUrl = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, safeUrl);
  if (safeUrl === '/' || safeUrl === '') filePath = path.join(ROOT, 'index.html');

  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      fs.stat(indexFile, (ie, istats) => {
        if (!ie && istats.isFile()) {
          res.writeHead(200, {'Content-Type': 'text/html'});
          fs.createReadStream(indexFile).pipe(res);
        } else {
          res.writeHead(403);
          res.end('Directory access denied');
        }
      });
      return;
    }

    res.writeHead(200, {'Content-Type': contentType(filePath)});
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Static server serving ${ROOT} on http://127.0.0.1:${PORT}`);
});
