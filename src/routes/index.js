'use strict';
var router = require('express').Router();

// ── Health check — ALWAYS 200 ─────────────────────────────────────────────
// Render's health probe hits this endpoint. Must return 2xx at all times
// or Render will mark the service as unhealthy and restart it.
router.get('/health', function(req, res) {
  res.status(200).json({
    status:    'ok',
    service:   'ProHorizon Scope Tracker API',
    version:   '1.0.0',
    dbReady:   req.app.locals.dbReady  === true,
    dbStatus:  req.app.locals.dbStatus || 'unknown',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()) + 's',
  });
});

// ── DB-ready gate ─────────────────────────────────────────────────────────
// Blocks API requests until database is connected.  Returns a clear 503
// with diagnostic details so the client knows to retry rather than crash.
// The health endpoint above is exempt from this gate.
router.use(function(req, res, next) {
  if (req.app.locals.dbReady === true) return next();

  var dbStatus = req.app.locals.dbStatus || 'connecting';
  return res.status(503).json({
    status:  'error',
    message: 'Service starting — database not yet connected',
    detail:  dbStatus,
    hint:    dbStatus === 'connecting'
      ? 'Server is starting. Retry in 10-30 seconds.'
      : 'Database connection failed. Check DATABASE_URL in Render Environment Variables.',
    timestamp: new Date().toISOString(),
  });
});

// ── API routes — only reachable after DB connects ─────────────────────────
router.use('/auth',          require('./auth.routes'));
router.use('/users',         require('./user.routes'));
router.use('/roles',         require('./role.routes'));
router.use('/projects',      require('./project.routes'));
router.use('/scopes',        require('./scope.routes'));
router.use('/tasks',         require('./task.routes'));
router.use('/teams',         require('./team.routes'));
router.use('/clients',       require('./client.routes'));
router.use('/documents',     require('./document.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/audit-logs',    require('./audit.routes'));
router.use('/reports',       require('./report.routes'));

module.exports = router;
