'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  type:         { type: DataTypes.STRING(100), allowNull: false, comment: 'task_assigned, task_due, project_update, scope_change, comment, mention, system' },
  title:        { type: DataTypes.STRING(255), allowNull: false },
  message:      { type: DataTypes.TEXT, allowNull: false },
  entity_type:  { type: DataTypes.STRING(100), comment: 'task, project, scope, document, user' },
  entity_id:    { type: DataTypes.INTEGER },
  action_url:   { type: DataTypes.STRING(500) },
  is_read:      { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at:      { type: DataTypes.DATE },
  priority:     { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  sent_via_email: { type: DataTypes.BOOLEAN, defaultValue: false },
  metadata:     { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'notifications',
  indexes: [
    { fields: ['user_id', 'is_read'] },
    { fields: ['entity_type', 'entity_id'] },
  ],
});

module.exports = Notification;
