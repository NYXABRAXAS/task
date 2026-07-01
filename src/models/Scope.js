'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Scope = sequelize.define('Scope', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' } },
  title:           { type: DataTypes.STRING(255), allowNull: false },
  description:     { type: DataTypes.TEXT },
  scope_type:      { type: DataTypes.STRING(100), comment: 'in-scope, out-of-scope, assumption, constraint' },
  category:        { type: DataTypes.STRING(150) },
  status:          { type: DataTypes.ENUM('draft', 'under_review', 'approved', 'rejected', 'change_requested', 'cancelled'), defaultValue: 'draft' },
  priority:        { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  current_version: { type: DataTypes.STRING(20), defaultValue: '1.0' },
  approved_by:     { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  approved_at:     { type: DataTypes.DATE },
  start_date:      { type: DataTypes.DATEONLY },
  end_date:        { type: DataTypes.DATEONLY },
  estimated_hours: { type: DataTypes.DECIMAL(10, 2) },
  actual_hours:    { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  completion_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  change_reason:   { type: DataTypes.TEXT },
  tags:            { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  created_by:      { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'scopes',
  indexes: [{ fields: ['project_id', 'status'] }],
});

module.exports = Scope;
