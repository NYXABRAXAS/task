'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaskAttachment = sequelize.define('TaskAttachment', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tasks', key: 'id' } },
  uploaded_by:  { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  file_name:    { type: DataTypes.STRING(255), allowNull: false },
  original_name:{ type: DataTypes.STRING(255), allowNull: false },
  file_path:    { type: DataTypes.STRING(500), allowNull: false },
  file_size:    { type: DataTypes.INTEGER },
  mime_type:    { type: DataTypes.STRING(150) },
  file_type:    { type: DataTypes.STRING(50) },
}, { tableName: 'task_attachments' });

module.exports = TaskAttachment;
