'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeamMember = sequelize.define('TeamMember', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  team_id:  { type: DataTypes.INTEGER, allowNull: false, references: { model: 'teams', key: 'id' } },
  user_id:  { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  role_in_team: { type: DataTypes.STRING(100), defaultValue: 'member' },
  joined_at:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  left_at:      { type: DataTypes.DATE },
  is_active:    { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'team_members',
  indexes: [{ unique: true, fields: ['team_id', 'user_id'] }],
});

module.exports = TeamMember;
