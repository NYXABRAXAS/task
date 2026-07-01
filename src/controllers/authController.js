'use strict';
var authService  = require('../services/authService');
var emailService = require('../services/emailService');
var auditService = require('../services/auditService');
var response     = require('../utils/response');
var logger       = require('../utils/logger');

var login = async function(req, res) {
  try {
    var email     = req.body.email;
    var password  = req.body.password;
    var ip        = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    var userAgent = req.headers['user-agent'] || '';

    if (!email || !password) {
      return response.error(res, 'Email and password are required', 400);
    }

    var result = await authService.login({ email: email, password: password, ip: ip, userAgent: userAgent });

    // Fire-and-forget audit log — don't let it block the login response
    auditService.log({
      user_id:    result.user.id,
      action:     'LOGIN',
      module:     'auth',
      ip_address: ip,
      user_agent: userAgent,
    }).catch(function(e) { logger.warn('Audit log failed: ' + e.message); });

    return response.success(res, result, 'Login successful');
  } catch (err) {
    logger.error('Login error: ' + err.message + (err.stack ? '\n' + err.stack : ''));
    return response.error(res, err.message || 'Login failed', err.status || 500);
  }
};

var refreshToken = async function(req, res) {
  try {
    var token = req.body.refreshToken;
    if (!token) return response.error(res, 'Refresh token required', 400);
    var result = await authService.refreshTokens(token);
    return response.success(res, result, 'Tokens refreshed');
  } catch (err) {
    logger.error('Refresh token error: ' + err.message);
    return response.error(res, err.message, err.status || 401);
  }
};

var logout = async function(req, res) {
  try {
    await authService.logout(req.user.id);
    auditService.log({
      user_id: req.user.id, action: 'LOGOUT', module: 'auth',
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    }).catch(function(e) { logger.warn('Audit log failed: ' + e.message); });
    return response.success(res, null, 'Logged out successfully');
  } catch (err) {
    return response.error(res, err.message, err.status || 500);
  }
};

var me = async function(req, res) {
  try {
    var user = await authService.getUserWithRoles(req.user.id);
    return response.success(res, user, 'Profile fetched');
  } catch (err) {
    return response.error(res, err.message, err.status || 500);
  }
};

var changePassword = async function(req, res) {
  try {
    await authService.changePassword(req.user.id, req.body);
    auditService.log({
      user_id: req.user.id, action: 'CHANGE_PASSWORD', module: 'auth',
      ip_address: req.ip, user_agent: req.headers['user-agent'],
    }).catch(function(e) { logger.warn('Audit log failed: ' + e.message); });
    return response.success(res, null, 'Password changed successfully');
  } catch (err) {
    return response.error(res, err.message, err.status || 500);
  }
};

var forgotPassword = async function(req, res) {
  try {
    var result = await authService.generatePasswordResetToken(req.body.email);
    if (result) {
      emailService.sendPasswordReset({
        email: result.user.email,
        name:  result.user.getFullName(),
        token: result.token,
      }).catch(function(e) { logger.error('Password reset email failed: ' + e.message); });
    }
    // Always 200 — do not reveal whether email exists
    return response.success(res, null, 'If the email exists, a reset link has been sent.');
  } catch (err) {
    return response.error(res, err.message, err.status || 500);
  }
};

var resetPassword = async function(req, res) {
  try {
    await authService.resetPassword(req.body);
    return response.success(res, null, 'Password reset successfully');
  } catch (err) {
    return response.error(res, err.message, err.status || 500);
  }
};

module.exports = { login: login, refreshToken: refreshToken, logout: logout, me: me, changePassword: changePassword, forgotPassword: forgotPassword, resetPassword: resetPassword };
