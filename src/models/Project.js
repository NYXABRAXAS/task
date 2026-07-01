'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Project = sequelize.define('Project', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_code: { type: DataTypes.STRING(50), unique: true },
  name:         { type: DataTypes.STRING(255), allowNull: false },
  description:  { type: DataTypes.TEXT },
  client_id:    { type: DataTypes.INTEGER, references: { model: 'clients', key: 'id' } },
  manager_id:   { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  category:     { type: DataTypes.STRING(100), comment: 'e.g. Chit Fund, Vehicle Loan LOS, Used Car LOS, Tractor LOS' },
  status:       { type: DataTypes.ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled'), defaultValue: 'planning' },
  priority:     { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  start_date:   { type: DataTypes.DATEONLY },
  end_date:     { type: DataTypes.DATEONLY },
  actual_end_date: { type: DataTypes.DATEONLY },
  budget:       { type: DataTypes.DECIMAL(15, 2) },
  budget_spent: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  completion_percentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  health:       { type: DataTypes.ENUM('green', 'amber', 'red'), defaultValue: 'green' },
  tags:         { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  metadata:     { type: DataTypes.JSONB, defaultValue: {} },
  created_by:   { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'projects',
  indexes: [
    { fields: ['status'] },
    { fields: ['client_id'] },
    { fields: ['manager_id'] },
  ],
});

module.exports = Project;
