'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { authenticate, checkPermission } = require('../middleware/auth');
const { exportLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.get('/dashboard', ctrl.getDashboard);
router.get('/project-health', checkPermission('reports', 'read'), ctrl.getProjectHealth);
router.get('/task-trend', checkPermission('reports', 'read'), ctrl.getTaskTrend);
router.get('/scope-changes', checkPermission('reports', 'read'), ctrl.getScopeChanges);
router.get('/team-worklog', checkPermission('reports', 'read'), ctrl.getTeamWorklog);

// Export endpoints
router.get('/export/projects/excel', exportLimiter, checkPermission('reports', 'export'), ctrl.exportProjectsExcel);
router.get('/export/tasks/excel', exportLimiter, checkPermission('reports', 'export'), ctrl.exportTasksExcel);
router.get('/export/projects/:id/pdf', exportLimiter, checkPermission('reports', 'export'), ctrl.exportProjectPDF);

module.exports = router;
