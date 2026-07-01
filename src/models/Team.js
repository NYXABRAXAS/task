'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Team = sequelize.define('Team', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:        { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  team_lead_id:{ type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
  department_id:{ type: DataTypes.INTEGER, references: { model: 'departments', key: 'id' } },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by:  { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, { tableName: 'teams' });

module.exports = Team;
