'use strict';
const { body } = require('express-validator');

const createProjectRules = [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('client_id').optional().isInt().withMessage('client_id must be integer'),
  body('manager_id').optional().isInt(),
  body('status').optional().isIn(['planning','active','on_hold','completed','cancelled']),
  body('priority').optional().isIn(['low','medium','high','critical']),
  body('start_date').optional().isDate(),
  body('end_date').optional().isDate(),
  body('budget').optional().isDecimal(),
];

const updateProjectRules = [
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['planning','active','on_hold','completed','cancelled']),
  body('priority').optional().isIn(['low','medium','high','critical']),
  body('health').optional().isIn(['green','amber','red']),
  body('completion_percentage').optional().isFloat({ min: 0, max: 100 }),
];

module.exports = { createProjectRules, updateProjectRules };
