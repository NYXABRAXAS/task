'use strict';
const router = require('express').Router();

// Health check — always responds 200 so Render health probe never fails.
// dbReady indicates whether the DB is connected and API is fully operational.
router.get('/health', function(req, res) {
  res.status(200).json({
    status:    'ok',
    service:   'ProHorizon Scope Tracker API',
    dbReady:   req.app.locals.dbReady === true,
    timestamp: new Date().toISOString(),
  });
});

// Block non-health API calls until DB is connected
router.use(function(req, res, next) {
  if (req.app.locals.dbReady !== true) {
    return res.status(503).json({
      status:  'error',
      message: 'Service is starting — database connecting. Please retry in a few seconds.',
    });
  }
  next();
});

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
