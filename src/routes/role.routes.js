'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/roleController');
const { authenticate, requireRole } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');

router.use(authenticate, auditMiddleware('roles'));

router.get('/permissions', ctrl.getAllPermissions); // all available permissions
router.get('/', ctrl.getAll);
router.post('/', requireRole('admin', 'super_admin'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', requireRole('admin', 'super_admin'), ctrl.update);
router.delete('/:id', requireRole('super_admin'), ctrl.remove);

module.exports = router;
