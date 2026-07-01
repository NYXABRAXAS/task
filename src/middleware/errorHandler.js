'use strict';
var logger = require('../utils/logger');

var errorHandler = function(err, req, res, next) {
  var status  = err.statusCode || err.status || 500;
  var message = err.message    || 'Internal server error';

  // Sequelize: validation / unique constraint
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    var fields = err.errors ? err.errors.map(function(e) { return { field: e.path, message: e.message }; }) : [];
    logger.warn('Validation error [' + req.method + ' ' + req.originalUrl + ']: ' + message);
    return res.status(422).json({ status: 'error', message: 'Validation error', errors: fields, timestamp: new Date().toISOString() });
  }

  // Sequelize: FK constraint
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ status: 'error', message: 'Referenced record does not exist', timestamp: new Date().toISOString() });
  }

  // Sequelize: DB connection error
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    logger.error('DB connection error [' + req.method + ' ' + req.originalUrl + ']: ' + message);
    return res.status(503).json({ status: 'error', message: 'Database unavailable — please retry in a moment', timestamp: new Date().toISOString() });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ status: 'error', message: 'Invalid token', timestamp: new Date().toISOString() });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ status: 'error', message: 'Token expired', timestamp: new Date().toISOString() });
  }

  // Log unexpected errors
  if (status >= 500) {
    logger.error('[' + req.method + ' ' + req.originalUrl + '] ' + status + ': ' + message + '\n' + (err.stack || ''));
  }

  return res.status(status).json({
    status:    'error',
    message:   message,
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorHandler;
