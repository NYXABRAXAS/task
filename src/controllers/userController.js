'use strict';
const userService = require('../services/userService');
const emailService = require('../services/emailService');
const { success, created, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { rows, count, page, limit } = await userService.findAll(req.query);
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    console.error('USER [getAll]:', err.message);
    return error(res, err.message, err.status || 500);
  }
};

const getOne = async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    return success(res, user);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const tempPassword = req.body.password || req.body.password_hash;
    const user = await userService.create(req.body, req.user.id);
    try {
      await emailService.sendWelcome({ email: user.email, name: user.getFullName(), tempPassword });
    } catch (e) { /* non-critical */ }
    await req.auditLog({ action: 'CREATE', entityType: 'users', entityId: user.id, entityName: user.email });
    return created(res, user, 'User created successfully');
  } catch (err) {
    console.error('USER [create]:', err.message);
    return error(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const user = await userService.update(req.params.id, req.body, req.user.id);
    await req.auditLog({ action: 'UPDATE', entityType: 'users', entityId: user.id, entityName: user.email });
    return success(res, user, 'User updated');
  } catch (err) {
    console.error('USER [update]:', err.message);
    return error(res, err.message, err.status || 500);
  }
};

const deactivate = async (req, res) => {
  try {
    await userService.deactivate(req.params.id);
    await req.auditLog({ action: 'DEACTIVATE', entityType: 'users', entityId: parseInt(req.params.id) });
    return success(res, null, 'User deactivated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const activate = async (req, res) => {
  try {
    await userService.activate(req.params.id);
    await req.auditLog({ action: 'ACTIVATE', entityType: 'users', entityId: parseInt(req.params.id) });
    return success(res, null, 'User activated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const avatarUrl = '/uploads/avatars/' + req.file.filename;
    await userService.updateAvatar(req.params.id, avatarUrl);
    return success(res, { avatar_url: avatarUrl }, 'Avatar updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getLoginHistory = async (req, res) => {
  try {
    const { rows, count, page, limit } = await userService.getLoginHistory(req.params.id, req.query);
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getPreferences = async (req, res) => {
  try {
    const user = await userService.findById(req.user.id);
    return success(res, user.preferences || {}, 'Preferences fetched');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const updatePreferences = async (req, res) => {
  try {
    const prefs = await userService.updatePreferences(req.user.id, req.body);
    return success(res, prefs, 'Preferences updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = {
  getAll, getOne, create, update, deactivate, activate,
  uploadAvatar, getLoginHistory, getPreferences, updatePreferences,
};
