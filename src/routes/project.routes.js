'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/projectController');
const { authenticate, checkPermission } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const validate = require('../middleware/validate');
const { createProjectRules, updateProjectRules } = require('../validators/projectValidators');

router.use(authenticate, auditMiddleware('projects'));

router.get('/', checkPermission('projects', 'read'), ctrl.getAll);
router.post('/', checkPermission('projects', 'create'), createProjectRules, validate, ctrl.create);
router.get('/:id', checkPermission('projects', 'read'), ctrl.getOne);
router.put('/:id', checkPermission('projects', 'update'), updateProjectRules, validate, ctrl.update);
router.delete('/:id', checkPermission('projects', 'delete'), ctrl.remove);
router.get('/:id/stats', checkPermission('projects', 'read'), ctrl.getStats);
router.post('/:id/members', checkPermission('projects', 'update'), ctrl.addMember);
router.delete('/:id/members/:userId', checkPermission('projects', 'update'), ctrl.removeMember);

module.exports = router;
