'use strict';
const { Client, User, Project } = require('../models');
const { Op } = require('sequelize');
const { success, created, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where[Op.or] = [
      { company_name: { [Op.iLike]: `%${search}%` } },
      { contact_email: { [Op.iLike]: `%${search}%` } },
      { client_code: { [Op.iLike]: `%${search}%` } },
    ];

    const { rows, count } = await Client.findAndCountAll({
      where,
      include: [
        {
          model: User,
          foreignKey: 'account_manager_id',
          as: 'accountManager',
          attributes: ['id', 'first_name', 'last_name'],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['company_name', 'ASC']],
      distinct: true,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    console.error('CLIENT API ERROR [getAll]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const getOne = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [
        { model: User, as: 'accountManager', attributes: ['id', 'first_name', 'last_name'], required: false },
        { model: Project, as: 'projects', attributes: ['id', 'name', 'project_code', 'status', 'completion_percentage'] },
      ],
    });
    if (!client) return error(res, 'Client not found', 404);
    return success(res, client);
  } catch (err) {
    console.error('CLIENT API ERROR [getOne]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const create = async (req, res) => {
  try {
    if (!req.body.client_code) {
      const count = await Client.count();
      req.body.client_code = `CLT-${String(count + 1).padStart(4, '0')}`;
    }
    const client = await Client.create(req.body);
    await req.auditLog({ action: 'CREATE', entityType: 'clients', entityId: client.id, entityName: client.company_name });
    return created(res, client, 'Client created');
  } catch (err) {
    console.error('CLIENT API ERROR [create]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const update = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return error(res, 'Client not found', 404);
    await client.update(req.body);
    await req.auditLog({ action: 'UPDATE', entityType: 'clients', entityId: client.id, entityName: client.company_name });
    return success(res, client, 'Client updated');
  } catch (err) {
    console.error('CLIENT API ERROR [update]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const remove = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return error(res, 'Client not found', 404);
    const projectCount = await Project.count({
      where: { client_id: req.params.id, status: { [Op.ne]: 'cancelled' } },
    });
    if (projectCount > 0)
      return error(res, `Cannot delete client with ${projectCount} active project(s)`, 400);
    await client.update({ status: 'inactive' });
    await req.auditLog({ action: 'DELETE', entityType: 'clients', entityId: client.id, entityName: client.company_name });
    return success(res, null, 'Client deactivated');
  } catch (err) {
    console.error('CLIENT API ERROR [remove]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

module.exports = { getAll, getOne, create, update, remove };
