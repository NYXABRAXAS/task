'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/taskController');
const { authenticate, checkPermission } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const { uploadTaskAttachments } = require('../middleware/upload');

router.use(authenticate, auditMiddleware('tasks'));

router.get('/', checkPermission('tasks', 'read'), ctrl.getAll);
router.post('/', checkPermission('tasks', 'create'), ctrl.create);
router.get('/:id', checkPermission('tasks', 'read'), ctrl.getOne);
router.put('/:id', checkPermission('tasks', 'update'), ctrl.update);
router.patch('/:id/move', checkPermission('tasks', 'update'), ctrl.moveKanban);
router.delete('/:id', checkPermission('tasks', 'delete'), ctrl.remove);

// Comments
router.post('/:id/comments', checkPermission('tasks', 'read'), ctrl.addComment);
router.put('/:id/comments/:commentId', authenticate, ctrl.updateComment);
router.delete('/:id/comments/:commentId', authenticate, ctrl.deleteComment);

// Work logs
router.post('/:id/work-logs', checkPermission('tasks', 'update'), ctrl.logWork);
router.get('/:id/work-logs', checkPermission('tasks', 'read'), ctrl.getWorkLogs);

// Attachments
router.post('/:id/attachments', checkPermission('tasks', 'update'), uploadTaskAttachments, ctrl.addAttachment);

module.exports = router;
