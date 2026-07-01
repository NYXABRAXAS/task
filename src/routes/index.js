'use strict';
const router = require('express').Router();

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

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ProHorizon Scope Tracker API', timestamp: new Date().toISOString() });
});

module.exports = router;
