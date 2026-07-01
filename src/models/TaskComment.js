'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaskComment = sequelize.define('TaskComment', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_id:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tasks', key: 'id' } },
  user_id:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  content:   { type: DataTypes.TEXT, allowNull: false },
  parent_id: { type: DataTypes.INTEGER, references: { model: 'task_comments', key: 'id' } },
  is_edited: { type: DataTypes.BOOLEAN, defaultValue: false },
  edited_at: { type: DataTypes.DATE },
}, { tableName: 'task_comments' });

module.exports = TaskComment;
