// Start the lightweight simple server so `node server/server.js` always starts a working API
try {
  require('./simple_server');
} catch (e) {
  console.error('Failed to start the server:', e.message);
  process.exit(1);
}