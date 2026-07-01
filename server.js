'use strict';
require('dotenv').config();
var http = require('http');
var SocketIO = require('socket.io').Server;

var app             = require('./src/app');
var dbConfig        = require('./src/config/database');
var logger          = require('./src/utils/logger');
var notificationSvc = require('./src/services/notificationService');

var PORT = parseInt(process.env.PORT) || 10000;

// ── HTTP server ────────────────────────────────────────────────────────────
var server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
var io = new SocketIO(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});

io.use(async function(socket, next) {
  try {
    var rawToken = socket.handshake.auth.token ||
                   (socket.handshake.headers['authorization'] || '').replace('Bearer ', '');
    if (!rawToken) return next(new Error('Authentication required'));

    var jwt     = require('jsonwebtoken');
    var decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
    var models  = require('./src/models');
    var user    = await models.User.findByPk(decoded.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'is_active'],
    });
    if (!user || !user.is_active) return next(new Error('User not found or inactive'));

    socket.userId = user.id;
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', function(socket) {
  var uid = socket.userId;
  socket.join('user:' + uid);
  socket.on('join:project',  function(pid)  { socket.join('project:' + pid); });
  socket.on('leave:project', function(pid)  { socket.leave('project:' + pid); });
  socket.on('task:update',   function(data) { socket.to('project:' + data.project_id).emit('task:updated',  data); });
  socket.on('scope:change',  function(data) { socket.to('project:' + data.project_id).emit('scope:changed', data); });
  socket.on('ping',          function()     { socket.emit('pong', { time: Date.now() }); });
  socket.on('disconnect',    function(r)    { logger.info('Socket disconnected: user ' + uid + ' (' + r + ')'); });
});

notificationSvc.setSocketIO(io);

// ── Auto-seed if DB is empty ───────────────────────────────────────────────
async function autoSeed() {
  if (process.env.AUTO_SEED !== 'true') return;
  try {
    var models = require('./src/models');
    var count  = await models.Role.count();
    if (count === 0) {
      logger.info('[SEED] Empty database — running auto-seed...');
      var seedFn = require('./database/seeders/seed');
      await seedFn();
      logger.info('[SEED] Seeding complete');
    } else {
      logger.info('[SEED] Database already has ' + count + ' roles — skipping seed');
    }
  } catch (e) {
    logger.warn('[SEED] Skipped: ' + e.message);
  }
}

// ── Database init — runs AFTER port is open ────────────────────────────────
// This is the correct Render pattern: bind port first so Render detects
// the service as alive, then connect the database in the background.
async function initDatabase() {
  // Log what DB config we're using
  if (process.env.DATABASE_URL) {
    logger.info('[DB] Connecting via DATABASE_URL...');
  } else if (process.env.DB_HOST) {
    logger.info('[DB] Connecting via DB_HOST=' + process.env.DB_HOST + ' DB_NAME=' + process.env.DB_NAME);
  } else {
    logger.warn('[DB] WARNING: No DATABASE_URL or DB_HOST configured.');
    logger.warn('[DB] Set DATABASE_URL in Render dashboard → Environment → Add Environment Variable');
    logger.warn('[DB] API requests will return 503 until database is configured.');
    // dbReady stays false — routes/index.js will return 503 for API calls
    return;
  }

  try {
    await dbConfig.connectDB();
    await autoSeed();
    app.locals.dbReady  = true;
    app.locals.dbStatus = 'connected';
    logger.info('[DB] Ready — all API routes operational');
  } catch (err) {
    logger.error('[DB] Connection failed: ' + err.message);
    app.locals.dbReady  = false;
    app.locals.dbStatus = 'error: ' + err.message.slice(0, 200);
    logger.error('[DB] API routes will return 503 until database is reachable.');
    logger.error('[DB] Check DATABASE_URL and that the Render PostgreSQL instance is running.');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// STARTUP — port MUST be open before any async work.
// Render's deploy scanner looks for an open port within ~30 seconds.
// If the port never opens, Render marks the deploy as failed.
// ══════════════════════════════════════════════════════════════════════════
app.locals.dbReady  = false;
app.locals.dbStatus = 'connecting';

server.listen(PORT, '0.0.0.0', function() {
  logger.info('='.repeat(60));
  logger.info('  ProHorizon Scope Tracker — Server started');
  logger.info('  Port       : ' + PORT);
  logger.info('  NODE_ENV   : ' + (process.env.NODE_ENV || 'development'));
  logger.info('  DB_URL set : ' + (process.env.DATABASE_URL ? 'YES' : 'NO'));
  logger.info('  DB_HOST set: ' + (process.env.DB_HOST    ? process.env.DB_HOST : 'NO'));
  logger.info('='.repeat(60));

  if (process.send) process.send('ready');

  // Non-blocking — database connects after port is open
  initDatabase();
});

server.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    logger.error('Port ' + PORT + ' is already in use');
  } else {
    logger.error('Server error: ' + err.message);
  }
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(signal + ' — shutting down gracefully...');
  server.close(function() {
    try { dbConfig.sequelize.close(); } catch (_) {}
    process.exit(0);
  });
  setTimeout(function() { process.exit(1); }, 10000);
}

process.on('SIGTERM', function() { shutdown('SIGTERM'); });
process.on('SIGINT',  function() { shutdown('SIGINT'); });
process.on('uncaughtException',  function(e) { logger.error('Uncaught: ' + e.message + '\n' + e.stack); process.exit(1); });
process.on('unhandledRejection', function(r)  { logger.error('Unhandled rejection: ' + r); process.exit(1); });
