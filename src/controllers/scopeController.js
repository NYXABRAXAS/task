'use strict';
const scopeService = require('../services/scopeService');
const notificationService = require('../services/notificationService');
const { ProjectMember } = require('../models');
const { success, created, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { rows, count, page, limit } = await scopeService.findAll(req.query);
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getOne = async (req, res) => {
  try {
    const scope = await scopeService.findById(req.params.id);
    return success(res, scope);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const scope = await scopeService.create(req.body, req.user.id);
    await req.auditLog({ action: 'CREATE', entityType: 'scopes', entityId: scope.id, entityName: scope.title, newValues: req.body });
    return created(res, scope, 'Scope created');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const { scope, oldValues } = await scopeService.update(req.params.id, req.body, req.user.id, req.body.change_summary);

    await req.auditLog({ action: 'UPDATE', entityType: 'scopes', entityId: scope.id, entityName: scope.title, oldValues, newValues: req.body });

    // Notify project members of scope change
    try {
      const members = await ProjectMember.findAll({ where: { project_id: scope.project_id, is_active: true } });
      const memberIds = members.map(m => m.user_id).filter(id => id !== req.user.id);
      await notificationService.notifyScopeChange(scope, req.user.getFullName(), memberIds);
    } catch (e) { /* non-critical */ }

    return success(res, scope, 'Scope updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const approve = async (req, res) => {
  try {
    const scope = await scopeService.approve(req.params.id, req.user.id);
    await req.auditLog({ action: 'APPROVE', entityType: 'scopes', entityId: scope.id, entityName: scope.title });
    return success(res, scope, 'Scope approved');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const reject = async (req, res) => {
  try {
    const scope = await scopeService.reject(req.params.id, req.body.reason);
    await req.auditLog({ action: 'REJECT', entityType: 'scopes', entityId: scope.id, entityName: scope.title });
    return success(res, scope, 'Scope rejected');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getVersionHistory = async (req, res) => {
  try {
    const versions = await scopeService.getVersionHistory(req.params.id);
    return success(res, versions);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    await scopeService.remove(req.params.id, req.user.id);
    await req.auditLog({ action: 'DELETE', entityType: 'scopes', entityId: parseInt(req.params.id) });
    return success(res, null, 'Scope deleted');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getOne, create, update, approve, reject, getVersionHistory, remove };
