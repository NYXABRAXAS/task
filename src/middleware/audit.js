'use strict';
const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware factory — logs every mutating request automatically.
 * For fine-grained logging, controllers call req.auditLog() directly.
 */
const auditMiddleware = (module) => async (req, res, next) => {
  const start = Date.now();

  // Override res.json to capture the response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    res._responseBody = body;
    return originalJson(body);
  };

  res.on('finish', async () => {
    try {
      // Only log mutating methods
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
      if (!req.user) return;

      const actionMap = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };
      const action = actionMap[req.method] || req.method;
      const status = res.statusCode < 400 ? 'success' : 'failure';

      await AuditLog.create({
        user_id: req.user.id,
        action,
        module,
        entity_type: module,
        entity_id: req.params.id ? parseInt(req.params.id) : null,
        ip_address: req.ip || req.headers['x-forwarded-for'],
        user_agent: req.headers['user-agent'],
        request_id: req.id,
        status,
        duration_ms: Date.now() - start,
        metadata: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
        },
      });
    } catch (err) {
      logger.error(`Audit logging failed: ${err.message}`);
    }
  });

  // Attach manual audit logger to req for controller use
  req.auditLog = async ({
    action, entityType, entityId, entityName,
    oldValues, newValues, metadata = {},
  }) => {
    try {
      await AuditLog.create({
        user_id: req.user?.id,
        action,
        module,
        entity_type: entityType || module,
        entity_id: entityId,
        entity_name: entityName,
        old_values: oldValues,
        new_values: newValues,
        ip_address: req.ip || req.headers['x-forwarded-for'],
        user_agent: req.headers['user-agent'],
        request_id: req.id,
        status: 'success',
        duration_ms: Date.now() - start,
        metadata,
      });
    } catch (err) {
      logger.error(`Manual audit log failed: ${err.message}`);
    }
  };

  next();
};

module.exports = auditMiddleware;
