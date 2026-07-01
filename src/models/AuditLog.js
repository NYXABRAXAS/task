'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:      { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  action:       { type: DataTypes.STRING(100), allowNull: false },
  module:       { type: DataTypes.STRING(100), allowNull: false },
  entity_type:  { type: DataTypes.STRING(100) },
  entity_id:    { type: DataTypes.INTEGER },
  entity_name:  { type: DataTypes.STRING(255) },
  old_values:   { type: DataTypes.JSONB },
  new_values:   { type: DataTypes.JSONB },
  ip_address:   { type: DataTypes.STRING(45) },
  user_agent:   { type: DataTypes.TEXT },
  request_id:   { type: DataTypes.STRING(100) },
  status:       { type: DataTypes.ENUM('success', 'failure'), defaultValue: 'success' },
  error_message:{ type: DataTypes.TEXT },
  duration_ms:  { type: DataTypes.INTEGER },
  metadata:     { type: DataTypes.JSONB, defaultValue: {} },
  // Explicit created_at column (timestamps: false so Sequelize won't manage it automatically)
  created_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'audit_logs',
  timestamps: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['module', 'action'] },
    { fields: ['entity_type', 'entity_id'] },
    { fields: ['created_at'] },
  ],
});

module.exports = AuditLog;
