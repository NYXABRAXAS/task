'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' } },
  user_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  role:       { type: DataTypes.STRING(100), defaultValue: 'member', comment: 'manager, lead, member, observer' },
  joined_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  left_at:    { type: DataTypes.DATE },
  is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
  permissions:{ type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'project_members',
  indexes: [{ unique: true, fields: ['project_id', 'user_id'] }],
});

module.exports = ProjectMember;
