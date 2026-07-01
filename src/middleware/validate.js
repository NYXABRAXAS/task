'use strict';
const { validationResult } = require('express-validator');
const { validationError } = require('../utils/response');

/**
 * Run after express-validator chains.
 * Returns 422 with all field errors if any exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({
      field: e.path || e.param,
      message: e.msg,
      value: e.value,
    }));
    return validationError(res, formatted);
  }
  next();
};

module.exports = validate;
