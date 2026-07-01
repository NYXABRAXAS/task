'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, checkPermission } = require('../middleware/auth');
const auditMiddleware = require('../middleware/audit');
const { uploadAvatar } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { createUserRules, updateUserRules } = require('../validators/userValidators');

router.use(authenticate, auditMiddleware('users'));

router.get('/',                    checkPermission('users', 'read'),   ctrl.getAll);
router.post('/',                   checkPermission('users', 'create'), createUserRules, validate, ctrl.create);
router.get('/preferences',         ctrl.getPreferences);
router.put('/preferences',         ctrl.updatePreferences);
router.get('/:id',                 checkPermission('users', 'read'),   ctrl.getOne);
router.put('/:id',                 checkPermission('users', 'update'), updateUserRules, validate, ctrl.update);
router.post('/:id/deactivate',     checkPermission('users', 'delete'), ctrl.deactivate);
router.post('/:id/activate',       checkPermission('users', 'update'), ctrl.activate);
router.post('/:id/avatar',         checkPermission('users', 'update'), uploadAvatar, ctrl.uploadAvatar);
router.get('/:id/login-history',   checkPermission('users', 'read'),  ctrl.getLoginHistory);

module.exports = router;
