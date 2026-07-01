'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/teamController');
const { authenticate, checkPermission } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');

router.use(authenticate, auditMiddleware('teams'));

router.get('/',                          checkPermission('teams', 'read'),   ctrl.getAll);
router.post('/',                         checkPermission('teams', 'create'), ctrl.create);
router.get('/:id',                       checkPermission('teams', 'read'),   ctrl.getOne);
router.put('/:id',                       checkPermission('teams', 'update'), ctrl.update);
router.delete('/:id',                    checkPermission('teams', 'delete'), ctrl.remove);
router.post('/:id/members',              checkPermission('teams', 'update'), ctrl.addMember);
router.delete('/:id/members/:userId',    checkPermission('teams', 'update'), ctrl.removeMember);

module.exports = router;
