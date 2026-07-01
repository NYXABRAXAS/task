'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/documentController');
const { authenticate, checkPermission } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const { uploadDocument } = require('../middleware/upload');

router.use(authenticate, auditMiddleware('documents'));

router.get('/', checkPermission('documents', 'read'), ctrl.getAll);
router.post('/', checkPermission('documents', 'create'), uploadDocument, ctrl.upload);
router.get('/:id', checkPermission('documents', 'read'), ctrl.getOne);
router.get('/:id/download', checkPermission('documents', 'read'), ctrl.download);
router.put('/:id', checkPermission('documents', 'update'), ctrl.update);
router.delete('/:id', checkPermission('documents', 'delete'), ctrl.remove);

module.exports = router;
