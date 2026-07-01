'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  task_code:      { type: DataTypes.STRING(50), unique: true },
  project_id:     { type: DataTypes.INTEGER, allowNull: false, references: { model: 'projects', key: 'id' } },
  scope_id:       { type: DataTypes.INTEGER, references: { model: 'scopes', key: 'id' } },
  parent_task_id: { type: DataTypes.INTEGER, references: { model: 'tasks', key: 'id' } },
  title:          { type: DataTypes.STRING(255), allowNull: false },
  description:    { type: DataTypes.TEXT },
  task_type:      { type: DataTypes.ENUM('feature', 'bug', 'enhancement', 'documentation', 'testing', 'design', 'devops', 'research'), defaultValue: 'feature' },
  status:         { type: DataTypes.ENUM('backlog', 'todo', 'in_progress', 'code_review', 'testing', 'done', 'cancelled'), defaultValue: 'backlog' },
  priority:       { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  assignee_id:    { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  reporter_id:    { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  start_date:     { type: DataTypes.DATEONLY },
  due_date:       { type: DataTypes.DATEONLY },
  completed_at:   { type: DataTypes.DATE },
  estimated_hours:{ type: DataTypes.DECIMAL(10, 2) },
  logged_hours:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  story_points:   { type: DataTypes.INTEGER },
  sprint:         { type: DataTypes.STRING(100) },
  milestone:      { type: DataTypes.STRING(255) },
  tags:           { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  position:       { type: DataTypes.INTEGER, defaultValue: 0, comment: 'Kanban column position' },
  is_blocked:     { type: DataTypes.BOOLEAN, defaultValue: false },
  blocked_reason: { type: DataTypes.TEXT },
  acceptance_criteria: { type: DataTypes.TEXT },
  metadata:       { type: DataTypes.JSONB, defaultValue: {} },
  created_by:     { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'tasks',
  indexes: [
    { fields: ['project_id', 'status'] },
    { fields: ['assignee_id'] },
    { fields: ['due_date'] },
    { fields: ['scope_id'] },
  ],
});

module.exports = Task;
