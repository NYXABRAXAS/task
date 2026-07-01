'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permission = sequelize.define('Permission', {
  id:     { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  module: { type: DataTypes.STRING(100), allowNull: false, comment: 'e.g. projects, tasks, users' },
  action: { type: DataTypes.STRING(100), allowNull: false, comment: 'e.g. create, read, update, delete, export' },
  name:   { type: DataTypes.STRING(200), allowNull: false, comment: 'module:action composite key' },
  description: { type: DataTypes.TEXT },
}, {
  tableName: 'permissions',
  indexes: [{ unique: true, fields: ['module', 'action'] }],
});

module.exports = Permission;
