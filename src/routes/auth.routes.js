'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { loginRules, changePasswordRules, forgotPasswordRules, resetPasswordRules } = require('../validators/authValidators');

router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.post('/refresh', ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.put('/change-password', authenticate, changePasswordRules, validate, ctrl.changePassword);
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, ctrl.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, ctrl.resetPassword);

module.exports = router;
