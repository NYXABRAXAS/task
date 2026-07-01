'use strict';
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app              = require('./src/app');
const { connectDB }    = require('./src/config/database');
const logger           = require('./src/utils/logger');
const notificationSvc  = require('./src/services/notificationService');

// ── PORT — always use process.env.PORT on Render ─────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

// ── HTTP Server ───────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));

    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { User } = require('./src/models');
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'first_name', 'last_name', 'email'],
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
  const userId = socket.userId;
  logger.info(`⚡  Socket connected: user ${userId} (${socket.id})`);
  socket.join(`user:${userId}`);

  socket.on('join:project',   (pid)  => socket.join(`project:${pid}`));
  socket.on('leave:project',  (pid)  => socket.leave(`project:${pid}`));
  socket.on('task:update',    (data) => socket.to(`project:${data.project_id}`).emit('task:updated', data));
  socket.on('scope:change',   (data) => socket.to(`project:${data.project_id}`).emit('scope:changed', data));
  socket.on('ping',           ()     => socket.emit('pong', { time: Date.now() }));

  socket.on('disconnect', (reason) => {
    logger.info(`⚡  Socket disconnected: user ${userId} (${reason})`);
  });
  socket.on('error', (err) => {
    logger.error(`Socket error for user ${userId}: ${err.message}`);
  });
});

notificationSvc.setSocketIO(io);

// ── Auto-seed on empty database ───────────────────────────────────────────
const autoSeed = async () => {
  if (process.env.AUTO_SEED !== 'true') return;
  try {
    const { Role } = require('./src/models');
    const count = await Role.count();
    if (count === 0) {
      logger.info('🌱  Empty database — running auto-seed...');
      const seedFn = require('./database/seeders/seed');
      await seedFn();
      logger.info('✅  Auto-seed complete');
    } else {
      logger.info(`🌱  Database already seeded (${count} roles found) — skipping`);
    }
  } catch (err) {
    logger.warn(`⚠️   Auto-seed skipped: ${err.message}`);
  }
};

// ── Start ─────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();
    await autoSeed();

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`\n${'═'.repeat(55)}`);
      logger.info(`  🚀  ProHorizon Scope Tracker`);
      logger.info(`  📡  http://0.0.0.0:${PORT}`);
      logger.info(`  🌱  ENV: ${process.env.NODE_ENV}`);
      logger.info(`  💾  DB:  ${process.env.DATABASE_URL ? 'Render PostgreSQL' : 'local'}`);
      logger.info(`${'═'.repeat(55)}\n`);

      // Signal PM2 / process managers that we're ready
      if (process.send) process.send('ready');
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      const { sequelize } = require('./src/config/database');
      await sequelize.close();
      logger.info('Database connection closed');
    } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => { logger.error(`Uncaught: ${err.message}`); process.exit(1); });
process.on('unhandledRejection', (r)   => { logger.error(`Unhandled: ${r}`);          process.exit(1); });

start();
