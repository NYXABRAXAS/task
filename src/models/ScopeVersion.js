'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScopeVersion = sequelize.define('ScopeVersion', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  scope_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'scopes', key: 'id' } },
  version:     { type: DataTypes.STRING(20), allowNull: false },
  title:       { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  snapshot:    { type: DataTypes.JSONB, allowNull: false, comment: 'Full scope object snapshot at this version' },
  change_summary: { type: DataTypes.TEXT },
  change_type: { type: DataTypes.ENUM('initial', 'minor', 'major', 'revision'), defaultValue: 'minor' },
  created_by:  { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'scope_versions',
  indexes: [{ unique: true, fields: ['scope_id', 'version'] }],
});

module.exports = ScopeVersion;
