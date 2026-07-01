'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserRole = sequelize.define('UserRole', {
  id:         { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  role_id:    { type: DataTypes.INTEGER, allowNull: false, references: { model: 'roles', key: 'id' } },
  assigned_by:{ type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  assigned_at:{ type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'user_roles',
  indexes: [{ unique: true, fields: ['user_id', 'role_id'] }],
});

module.exports = UserRole;
