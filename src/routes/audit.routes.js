'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/auditController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', ctrl.getAll);
router.get('/modules', ctrl.getModules);

module.exports = router;
