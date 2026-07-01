'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/scopeController');
const { authenticate, checkPermission } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');

router.use(authenticate, auditMiddleware('scopes'));

router.get('/',                    checkPermission('scopes', 'read'),   ctrl.getAll);
router.post('/',                   checkPermission('scopes', 'create'), ctrl.create);
router.get('/:id',                 checkPermission('scopes', 'read'),   ctrl.getOne);
router.put('/:id',                 checkPermission('scopes', 'update'), ctrl.update);
router.delete('/:id',              checkPermission('scopes', 'delete'), ctrl.remove);
router.post('/:id/approve',        checkPermission('scopes', 'approve'), ctrl.approve);
router.post('/:id/reject',         checkPermission('scopes', 'approve'), ctrl.reject);
router.get('/:id/versions',        checkPermission('scopes', 'read'),   ctrl.getVersionHistory);

module.exports = router;
