'use strict';
const jwt = require('jsonwebtoken');
const { User, Role, Permission, UserRole, RolePermission } = require('../models');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verify JWT access token and attach user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') return unauthorized(res, 'Token has expired');
      return unauthorized(res, 'Invalid token');
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token', 'email_verify_token'] },
      include: [{
        model: Role,
        as: 'roles',
        through: { attributes: [] },
        include: [{
          model: Permission,
          as: 'permissions',
          through: { attributes: [] },
        }],
      }],
    });

    if (!user) return unauthorized(res, 'User not found');
    if (!user.is_active) return unauthorized(res, 'Account is deactivated');

    // Flatten permissions into a Set for O(1) lookup
    const permSet = new Set();
    for (const role of user.roles) {
      for (const perm of role.permissions) {
        permSet.add(perm.name); // e.g. "projects:create"
      }
    }

    req.user = user;
    req.userPermissions = permSet;
    req.userRoles = user.roles.map(r => r.name);
    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err.message}`);
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * RBAC permission check factory
 * Usage: router.post('/', authenticate, checkPermission('projects', 'create'), controller)
 */
const checkPermission = (module, action) => {
  return (req, res, next) => {
    const permKey = `${module}:${action}`;

    // Super admin bypasses all permission checks
    if (req.userRoles && req.userRoles.includes('super_admin')) return next();

    if (!req.userPermissions || !req.userPermissions.has(permKey)) {
      return forbidden(res, `You do not have permission to perform '${action}' on '${module}'`);
    }
    next();
  };
};

/**
 * Require one of the given roles
 * Usage: requireRole('admin', 'manager')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    const hasRole = req.userRoles && roles.some(r => req.userRoles.includes(r));
    if (!hasRole) return forbidden(res, 'Insufficient role');
    next();
  };
};

/**
 * Optional auth — attaches user if token present, continues if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token', 'email_verify_token'] },
    });
    if (user && user.is_active) req.user = user;
    next();
  } catch {
    next(); // ignore errors — optional
  }
};

module.exports = { authenticate, checkPermission, requireRole, optionalAuth };
