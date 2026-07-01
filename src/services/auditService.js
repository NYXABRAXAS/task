'use strict';
const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

const findAll = async (query = {}) => {
  const { user_id, module, action, entity_type, entity_id, status, from_date, to_date, page = 1, limit = 50 } = query;
  const where = {};
  if (user_id) where.user_id = user_id;
  if (module) where.module = module;
  if (action) where.action = action;
  if (entity_type) where.entity_type = entity_type;
  if (entity_id) where.entity_id = entity_id;
  if (status) where.status = status;
  if (from_date || to_date) {
    where.created_at = {};
    if (from_date) where.created_at[Op.gte] = new Date(from_date);
    if (to_date) where.created_at[Op.lte] = new Date(to_date);
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'], required: false }],
    limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['created_at', 'DESC']], distinct: true,
  });
  return { rows, count, page: parseInt(page), limit: parseInt(limit) };
};

const getModules = async () => {
  return AuditLog.findAll({
    attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('module')), 'module']],
    raw: true,
  });
};

const log = async ({
  user_id, action, module, entity_type, entity_id, entity_name,
  old_values, new_values, ip_address, user_agent, status = 'success',
  error_message, metadata = {},
}) => {
  return AuditLog.create({
    user_id, action, module, entity_type, entity_id, entity_name,
    old_values, new_values, ip_address, user_agent, status, error_message, metadata,
  });
};

module.exports = { findAll, getModules, log };
