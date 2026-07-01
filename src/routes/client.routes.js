'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/clientController');
const { authenticate, checkPermission } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');

router.use(authenticate, auditMiddleware('clients'));

router.get('/', checkPermission('clients', 'read'), ctrl.getAll);
router.post('/', checkPermission('clients', 'create'), ctrl.create);
router.get('/:id', checkPermission('clients', 'read'), ctrl.getOne);
router.put('/:id', checkPermission('clients', 'update'), ctrl.update);
router.delete('/:id', checkPermission('clients', 'delete'), ctrl.remove);

module.exports = router;
