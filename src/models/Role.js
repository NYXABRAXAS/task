'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(100), allowNull: false, unique: true },
  display_name:{ type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  is_system:   { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'System roles cannot be deleted' },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'roles' });

module.exports = Role;
