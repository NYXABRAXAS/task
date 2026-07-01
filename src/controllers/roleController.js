'use strict';
const { Role, Permission, RolePermission, User } = require('../models');
const { success, created, error } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
      order: [['id', 'ASC']],
    });
    return success(res, roles);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getOne = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
    });
    if (!role) return error(res, 'Role not found', 404);
    return success(res, role);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const { permission_ids, ...roleData } = req.body;
    const role = await Role.create(roleData);
    if (permission_ids?.length) {
      const perms = await Permission.findAll({ where: { id: permission_ids } });
      await role.setPermissions(perms);
    }
    const full = await Role.findByPk(role.id, { include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] });
    await req.auditLog({ action: 'CREATE', entityType: 'roles', entityId: role.id, entityName: role.name });
    return created(res, full, 'Role created');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return error(res, 'Role not found', 404);
    if (role.is_system) return error(res, 'System roles cannot be modified', 403);

    const { permission_ids, ...roleData } = req.body;
    await role.update(roleData);
    if (permission_ids !== undefined) {
      const perms = await Permission.findAll({ where: { id: permission_ids } });
      await role.setPermissions(perms);
    }
    await req.auditLog({ action: 'UPDATE', entityType: 'roles', entityId: role.id, entityName: role.name });
    return success(res, await Role.findByPk(role.id, { include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] }), 'Role updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return error(res, 'Role not found', 404);
    if (role.is_system) return error(res, 'System roles cannot be deleted', 403);
    await role.destroy();
    return success(res, null, 'Role deleted');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getAllPermissions = async (req, res) => {
  try {
    const perms = await Permission.findAll({ order: [['module', 'ASC'], ['action', 'ASC']] });
    return success(res, perms);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getOne, create, update, remove, getAllPermissions };
