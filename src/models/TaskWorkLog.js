'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaskWorkLog = sequelize.define('TaskWorkLog', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tasks', key: 'id' } },
  user_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  hours_logged: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  work_date:    { type: DataTypes.DATEONLY, allowNull: false },
  description:  { type: DataTypes.TEXT },
  billable:     { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'task_work_logs' });

module.exports = TaskWorkLog;
