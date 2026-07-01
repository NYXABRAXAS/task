'use strict';
const projectService = require('../services/projectService');
const notificationService = require('../services/notificationService');
const { success, created, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { rows, count, page, limit } = await projectService.findAll(req.query, req.user.id, req.userRoles);
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getOne = async (req, res) => {
  try {
    const project = await projectService.findById(req.params.id);
    return success(res, project);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const project = await projectService.create(req.body, req.user.id);
    await req.auditLog({ action: 'CREATE', entityType: 'projects', entityId: project.id, entityName: project.name, newValues: req.body });
    return created(res, project, 'Project created successfully');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const project = await projectService.findById(req.params.id);
    const oldValues = project.toJSON();
    const updated = await projectService.update(req.params.id, req.body);
    await req.auditLog({ action: 'UPDATE', entityType: 'projects', entityId: updated.id, entityName: updated.name, oldValues, newValues: req.body });
    return success(res, updated, 'Project updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    await projectService.remove(req.params.id);
    await req.auditLog({ action: 'DELETE', entityType: 'projects', entityId: parseInt(req.params.id) });
    return success(res, null, 'Project cancelled');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const addMember = async (req, res) => {
  try {
    const member = await projectService.addMember(req.params.id, req.body);
    return success(res, member, 'Member added');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const removeMember = async (req, res) => {
  try {
    await projectService.removeMember(req.params.id, req.params.userId);
    return success(res, null, 'Member removed');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await projectService.getStats(req.params.id);
    return success(res, stats);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getOne, create, update, remove, addMember, removeMember, getStats };
