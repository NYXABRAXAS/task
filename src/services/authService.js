'use strict';
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { User, Role, Permission, UserRole, LoginHistory } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5;
const LOCK_MINUTES = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES) || 30;

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

const getUserWithRoles = async (userId) => {
  return User.findByPk(userId, {
    attributes: { exclude: ['password_hash', 'refresh_token', 'password_reset_token', 'email_verify_token'] },
    include: [{
      model: Role,
      as: 'roles',
      through: { attributes: [] },
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] },
      }],
    }],
  });
};

const login = async ({ email, password, ip, userAgent }) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    await LoginHistory.create({ user_id: null, ip_address: ip, user_agent: userAgent, status: 'failed', failure_reason: 'User not found' });
    throw { status: 401, message: 'Invalid credentials' };
  }

  // Check if account is locked
  if (user.locked_until && moment().isBefore(user.locked_until)) {
    const minutesLeft = moment(user.locked_until).diff(moment(), 'minutes');
    await LoginHistory.create({ user_id: user.id, ip_address: ip, user_agent: userAgent, status: 'locked', failure_reason: 'Account locked' });
    throw { status: 423, message: `Account locked. Try again in ${minutesLeft} minute(s).` };
  }

  if (!user.is_active) throw { status: 403, message: 'Account is deactivated. Contact administrator.' };

  const valid = await user.validatePassword(password);
  if (!valid) {
    const attempts = user.failed_login_attempts + 1;
    const updates = { failed_login_attempts: attempts };

    if (attempts >= MAX_ATTEMPTS) {
      updates.locked_until = moment().add(LOCK_MINUTES, 'minutes').toDate();
      updates.failed_login_attempts = 0;
    }
    await user.update(updates);

    await LoginHistory.create({ user_id: user.id, ip_address: ip, user_agent: userAgent, status: 'failed', failure_reason: 'Wrong password' });
    const remaining = MAX_ATTEMPTS - (attempts < MAX_ATTEMPTS ? attempts : 0);
    throw { status: 401, message: attempts >= MAX_ATTEMPTS ? `Account locked for ${LOCK_MINUTES} minutes after too many failed attempts.` : `Invalid credentials. ${remaining} attempts remaining.` };
  }

  // Successful login
  await user.update({ failed_login_attempts: 0, locked_until: null, last_login_at: new Date() });

  const { accessToken, refreshToken } = generateTokens(user.id);
  await user.update({ refresh_token: refreshToken });

  await LoginHistory.create({ user_id: user.id, ip_address: ip, user_agent: userAgent, status: 'success', logged_in_at: new Date() });

  const fullUser = await getUserWithRoles(user.id);
  return { accessToken, refreshToken, user: fullUser };
};

const refreshTokens = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token' };
  }

  const user = await User.findOne({ where: { id: decoded.id, refresh_token: token } });
  if (!user || !user.is_active) throw { status: 401, message: 'Refresh token not recognized' };

  const { accessToken, refreshToken } = generateTokens(user.id);
  await user.update({ refresh_token: refreshToken });
  return { accessToken, refreshToken };
};

const logout = async (userId) => {
  await User.update({ refresh_token: null }, { where: { id: userId } });
  const lastLogin = await LoginHistory.findOne({ where: { user_id: userId, status: 'success', logged_out_at: null }, order: [['logged_in_at', 'DESC']] });
  if (lastLogin) await lastLogin.update({ logged_out_at: new Date() });
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findByPk(userId);
  if (!user) throw { status: 404, message: 'User not found' };

  const valid = await user.validatePassword(currentPassword);
  if (!valid) throw { status: 400, message: 'Current password is incorrect' };

  await user.update({ password_hash: newPassword });
};

const generatePasswordResetToken = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) return; // Don't reveal if email exists

  const token = uuidv4();
  const expires = moment().add(1, 'hour').toDate();
  await user.update({ password_reset_token: token, password_reset_expires: expires });
  return { user, token };
};

const resetPassword = async ({ token, newPassword }) => {
  const user = await User.findOne({
    where: {
      password_reset_token: token,
      password_reset_expires: { [Op.gt]: new Date() },
    },
  });
  if (!user) throw { status: 400, message: 'Invalid or expired password reset token' };
  await user.update({ password_hash: newPassword, password_reset_token: null, password_reset_expires: null });
};

module.exports = { login, refreshTokens, logout, changePassword, generatePasswordResetToken, resetPassword, getUserWithRoles };
