'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Client = sequelize.define('Client', {
  id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  client_code:     { type: DataTypes.STRING(50), unique: true },
  company_name:    { type: DataTypes.STRING(255), allowNull: false },
  industry:        { type: DataTypes.STRING(100) },
  contact_person:  { type: DataTypes.STRING(150) },
  contact_email:   { type: DataTypes.STRING(255), validate: { isEmail: true } },
  contact_phone:   { type: DataTypes.STRING(20) },
  address:         { type: DataTypes.TEXT },
  city:            { type: DataTypes.STRING(100) },
  state:           { type: DataTypes.STRING(100) },
  country:         { type: DataTypes.STRING(100), defaultValue: 'India' },
  pincode:         { type: DataTypes.STRING(20) },
  gstin:           { type: DataTypes.STRING(20) },
  pan:             { type: DataTypes.STRING(20) },
  website:         { type: DataTypes.STRING(500) },
  logo_url:        { type: DataTypes.STRING(500) },
  portal_enabled:  { type: DataTypes.BOOLEAN, defaultValue: false },
  portal_username: { type: DataTypes.STRING(255) },
  portal_password_hash: { type: DataTypes.STRING(255) },
  status:          { type: DataTypes.ENUM('active', 'inactive', 'prospect', 'churned'), defaultValue: 'active' },
  notes:           { type: DataTypes.TEXT },
  account_manager_id: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' } },
}, { tableName: 'clients' });

module.exports = Client;
