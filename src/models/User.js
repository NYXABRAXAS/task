'use strict';
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employee_id:   { type: DataTypes.STRING(50), unique: true },
  first_name:    { type: DataTypes.STRING(100), allowNull: false },
  last_name:     { type: DataTypes.STRING(100), allowNull: false },
  email:         { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  phone:         { type: DataTypes.STRING(20) },
  avatar_url:    { type: DataTypes.STRING(500) },
  department_id: { type: DataTypes.INTEGER, references: { model: 'departments', key: 'id' } },
  designation:   { type: DataTypes.STRING(150) },
  is_active:     { type: DataTypes.BOOLEAN, defaultValue: true },
  is_email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_login_at: { type: DataTypes.DATE },
  failed_login_attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  locked_until:  { type: DataTypes.DATE },
  password_reset_token:   { type: DataTypes.STRING(255) },
  password_reset_expires: { type: DataTypes.DATE },
  email_verify_token: { type: DataTypes.STRING(255) },
  refresh_token:      { type: DataTypes.TEXT },
  preferences:   { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password_hash = await bcrypt.hash(user.password_hash, rounds);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password_hash = await bcrypt.hash(user.password_hash, rounds);
      }
    },
  },
});

// Instance methods
User.prototype.validatePassword = async function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

User.prototype.toSafeJSON = function () {
  const { password_hash, refresh_token, password_reset_token, email_verify_token, ...safe } = this.toJSON();
  return safe;
};

User.prototype.getFullName = function () {
  return `${this.first_name} ${this.last_name}`;
};

module.exports = User;
