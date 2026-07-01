'use strict';
const { User, Role, Department, UserRole, LoginHistory } = require('../models');
const { Op } = require('sequelize');

const buildUserQuery = (query = {}) => {
  const { search, department_id, role, is_active, page = 1, limit = 20 } = query;
  const where = {};
  if (is_active !== undefined) where.is_active = is_active === 'true' || is_active === true;
  if (department_id) where.department_id = department_id;
  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { employee_id: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return {
    where,
    include: [
      { model: Role, as: 'roles', through: { attributes: [] } },
      { model: Department, as: 'department', attributes: ['id', 'name'] },
    ],
    attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token', 'email_verify_token'] },
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['first_name', 'ASC']],
    distinct: true,
  };
};

const findAll = async (query) => {
  const opts = buildUserQuery(query);
  const { rows, count } = await User.findAndCountAll(opts);
  return { rows, count, page: parseInt(query.page || 1), limit: parseInt(query.limit || 20) };
};

const findById = async (id) => {
  const user = await User.findByPk(id, {
    include: [
      { model: Role, as: 'roles', through: { attributes: [] } },
      { model: Department, as: 'department' },
    ],
    attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token', 'email_verify_token'] },
  });
  if (!user) throw { status: 404, message: 'User not found' };
  return user;
};

const create = async (data, createdById) => {
  // Support both role_ids (array) and role_id (single int) from frontend
  let { role_ids, role_id, password, ...userData } = data;

  // Map plain 'password' → 'password_hash' for the User model's bcrypt hook
  if (password) userData.password_hash = password;
  if (!userData.password_hash) throw { status: 400, message: 'Password is required' };

  // Normalise role_id → role_ids
  if (!role_ids && role_id) role_ids = [parseInt(role_id)];

  const existing = await User.findOne({ where: { email: userData.email } });
  if (existing) throw { status: 409, message: 'Email already registered' };

  const user = await User.create(userData);

  if (role_ids && role_ids.length > 0) {
    const roles = await Role.findAll({ where: { id: role_ids } });
    if (roles.length !== role_ids.length) throw { status: 400, message: 'One or more roles not found' };
    await user.setRoles(roles, { through: { assigned_by: createdById } });
  }

  return findById(user.id);
};

const update = async (id, data, updatedById) => {
  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: 'User not found' };

  let { role_ids, role_id, password, ...userData } = data;

  // Support plain password → password_hash mapping
  if (password) userData.password_hash = password;

  // Normalise role_id → role_ids
  if (role_ids === undefined && role_id !== undefined) role_ids = [parseInt(role_id)];

  // Prevent email collision
  if (userData.email && userData.email !== user.email) {
    const exists = await User.findOne({ where: { email: userData.email } });
    if (exists) throw { status: 409, message: 'Email already in use' };
  }

  await user.update(userData);

  if (role_ids !== undefined) {
    const roles = await Role.findAll({ where: { id: role_ids } });
    await user.setRoles(roles, { through: { assigned_by: updatedById } });
  }

  return findById(user.id);
};

const deactivate = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.is_active === false) throw { status: 400, message: 'User is already inactive' };
  await user.update({ is_active: false, refresh_token: null });
};

const activate = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: 'User not found' };
  await user.update({ is_active: true });
};

const updateAvatar = async (id, avatarUrl) => {
  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: 'User not found' };
  await user.update({ avatar_url: avatarUrl });
  return user;
};

const getLoginHistory = async (userId, { page = 1, limit = 20 } = {}) => {
  const { rows, count } = await LoginHistory.findAndCountAll({    where: { user_id: userId },
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['logged_in_at', 'DESC']],
  });
  return { rows, count, page: parseInt(page), limit: parseInt(limit) };
};

const updatePreferences = async (userId, preferences) => {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, message: 'User not found' };
  const merged = { ...user.preferences, ...preferences };
  await user.update({ preferences: merged });
  return merged;
};

module.exports = { findAll, findById, create, update, deactivate, activate, updateAvatar, getLoginHistory, updatePreferences };

