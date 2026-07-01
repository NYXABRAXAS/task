'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(150), allowNull: false, unique: true },
  code:        { type: DataTypes.STRING(20), unique: true },
  description: { type: DataTypes.TEXT },
  head_user_id:{ type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'departments' });

module.exports = Department;
