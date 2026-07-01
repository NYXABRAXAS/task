'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LoginHistory = sequelize.define('LoginHistory', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:        { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
  ip_address:     { type: DataTypes.STRING(45) },
  user_agent:     { type: DataTypes.TEXT },
  status:         { type: DataTypes.ENUM('success', 'failed', 'locked'), defaultValue: 'success' },
  failure_reason: { type: DataTypes.STRING(255) },
  location:       { type: DataTypes.STRING(255) },
  logged_in_at:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  logged_out_at:  { type: DataTypes.DATE },
}, { tableName: 'login_history', timestamps: false });

module.exports = LoginHistory;
