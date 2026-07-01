'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RolePermission = sequelize.define('RolePermission', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role_id:       { type: DataTypes.INTEGER, allowNull: false, references: { model: 'roles', key: 'id' } },
  permission_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'permissions', key: 'id' } },
}, {
  tableName: 'role_permissions',
  indexes: [{ unique: true, fields: ['role_id', 'permission_id'] }],
});

module.exports = RolePermission;
