'use strict';
const auditService = require('../services/auditService');
const { success, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { rows, count, page, limit } = await auditService.findAll(req.query);
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getModules = async (req, res) => {
  try {
    const modules = await auditService.getModules();
    return success(res, modules.map(m => m.module));
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getModules };
