'use strict';
const { body } = require('express-validator');

const createUserRules = [
  body('first_name').trim().notEmpty().withMessage('First name required'),
  body('last_name').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role_ids').optional().isArray().withMessage('role_ids must be an array'),
  body('role_id').optional().isInt().withMessage('role_id must be an integer'),
];

const updateUserRules = [
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('role_ids').optional().isArray(),
];

module.exports = { createUserRules, updateUserRules };
