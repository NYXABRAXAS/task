'use strict';
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const auditService = require('../services/auditService');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await authService.login({ email, password, ip, userAgent });

    await auditService.log({
      user_id: result.user.id, action: 'LOGIN', module: 'auth',
      ip_address: ip, user_agent: userAgent,
    });

    return success(res, result, 'Login successful');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return error(res, 'Refresh token required', 400);
    const result = await authService.refreshTokens(token);
    return success(res, result, 'Tokens refreshed');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const logout = async (req, res) => {
  try {
    await authService.logout(req.user.id);
    await auditService.log({
      user_id: req.user.id, action: 'LOGOUT', module: 'auth',
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const me = async (req, res) => {
  try {
    const user = await authService.getUserWithRoles(req.user.id);
    return success(res, user, 'Profile fetched');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const changePassword = async (req, res) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    await auditService.log({
      user_id: req.user.id, action: 'CHANGE_PASSWORD', module: 'auth',
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    });
    return success(res, null, 'Password changed successfully');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const result = await authService.generatePasswordResetToken(req.body.email);
    if (result) {
      const { user, token } = result;
      try {
        await emailService.sendPasswordReset({ email: user.email, name: user.getFullName(), token });
      } catch (e) {
        logger.error(`Failed to send password reset email: ${e.message}`);
      }
    }
    // Always return success (don't reveal if email exists)
    return success(res, null, 'If the email exists, a reset link has been sent.');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body);
    return success(res, null, 'Password reset successfully');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { login, refreshToken, logout, me, changePassword, forgotPassword, resetPassword };
