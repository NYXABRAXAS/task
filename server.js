'use strict';
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app             = require('./src/app');
const { connectDB }   = require('./src/config/database');
const logger          = require('./src/utils/logger');
const notificationSvc = require('./src/services/notificationService');

const PORT = parseInt(process.env.PORT) || 10000;

// ── HTTP Server ────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      (socket.handshake.headers['authorization'] || '').split(' ')[1];
    if (!token) return next(new Error('Authentication required'));

    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { User } = require('./src/models');
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'is_active'],
    });
    if (!user || !user.is_active) return next(new Error('User not found or inactive'));

    socket.userId = user.id;
    socket.user   = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const uid = socket.userId;
  logger.info('Socket connected: user ' + uid + ' (' + socket.id + ')');
  socket.join('user:' + uid);

  socket.on('join:project',  function(pid)  { socket.join('project:' + pid); });
  socket.on('leave:project', function(pid)  { socket.leave('project:' + pid); });
  socket.on('task:update',   function(data) { socket.to('project:' + data.project_id).emit('task:updated',  data); });
  socket.on('scope:change',  function(data) { socket.to('project:' + data.project_id).emit('scope:changed', data); });
  socket.on('ping',          function()     { socket.emit('pong', { time: Date.now() }); });
  socket.on('disconnect',    function(r)    { logger.info('Socket disconnected: user ' + uid + ' (' + r + ')'); });
  socket.on('error',         function(e)    { logger.error('Socket error user ' + uid + ': ' + e.message); });
});

notificationSvc.setSocketIO(io);

// ── Auto-seed (called after DB is ready) ──────────────────────────────────
async function autoSeed() {
  if (process.env.AUTO_SEED !== 'true') return;
  try {
    const { Role } = require('./src/models');
    const count = await Role.count();
    if (count === 0) {
      logger.info('Empty database — running auto-seed...');
      const seedFn = require('./database/seeders/seed');
      await seedFn();
      logger.info('Auto-seed complete');
    } else {
      logger.info('Database already seeded (' + count + ' roles) — skipping');
    }
  } catch (err) {
    logger.warn('Auto-seed skipped: ' + err.message);
  }
}

// ── DB init runs in the background after port is open ─────────────────────
async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    logger.warn('DATABASE_URL not set — running without database. Set it in Render dashboard.');
    return;
  }
  try {
    await connectDB();       // retries up to 8x with backoff
    await autoSeed();
    app.locals.dbReady = true;
    logger.info('Database ready — API fully operational');
  } catch (err) {
    logger.error('Database initialization failed: ' + err.message);
    // Server stays alive — health endpoint continues to respond
    // Render will keep retrying; DB may become available after DB instance warms up
  }
}

// ══════════════════════════════════════════════════════════════════════════
// START: bind the port IMMEDIATELY, THEN connect DB in background.
// This prevents Render's "No open ports detected" error which happens when
// the DB is slow to start and the server never reaches server.listen().
// ══════════════════════════════════════════════════════════════════════════
app.locals.dbReady = false;

server.listen(PORT, '0.0.0.0', function() {
  logger.info('='.repeat(55));
  logger.info('  ProHorizon Scope Tracker');
  logger.info('  Listening on port ' + PORT);
  logger.info('  NODE_ENV: ' + (process.env.NODE_ENV || 'development'));
  logger.info('  DB: ' + (process.env.DATABASE_URL ? 'connecting in background...' : 'NOT CONFIGURED'));
  logger.info('='.repeat(55));

  // Signal PM2 / Render that the process is alive
  if (process.send) process.send('ready');

  // Start DB connection AFTER port is open
  initDatabase();
});

server.on('error', function(err) {
  logger.error('Server error: ' + err.message);
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(signal + ' received — shutting down...');
  server.close(function() {
    try {
      var db = require('./src/config/database');
      db.sequelize.close();
    } catch (_) {}
    process.exit(0);
  });
  setTimeout(function() { process.exit(1); }, 10000);
}

process.on('SIGTERM', function() { shutdown('SIGTERM'); });
process.on('SIGINT',  function() { shutdown('SIGINT'); });
process.on('uncaughtException',  function(err) { logger.error('Uncaught: ' + err.message); process.exit(1); });
process.on('unhandledRejection', function(r)   { logger.error('Unhandled rejection: ' + r); process.exit(1); });
