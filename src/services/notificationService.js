'use strict';
const { Notification, User } = require('../models');
const { Op } = require('sequelize');

let _io = null;
const setSocketIO = (io) => { _io = io; };

const emit = (userId, notification) => {
  if (_io) _io.to(`user:${userId}`).emit('notification', notification);
};

const create = async ({ user_id, type, title, message, entity_type, entity_id, action_url, priority = 'medium', metadata = {} }) => {
  const notif = await Notification.create({ user_id, type, title, message, entity_type, entity_id, action_url, priority, metadata });
  emit(user_id, notif);
  return notif;
};

const broadcast = async ({ user_ids, type, title, message, entity_type, entity_id, action_url, priority = 'medium' }) => {
  const notifs = await Notification.bulkCreate(
    user_ids.map(uid => ({ user_id: uid, type, title, message, entity_type, entity_id, action_url, priority }))
  );
  notifs.forEach(n => emit(n.user_id, n));
  return notifs;
};

const findAll = async (userId, { unread_only = false, page = 1, limit = 20 } = {}) => {
  const where = { user_id: userId };
  if (unread_only === true || unread_only === 'true') where.is_read = false;

  const { rows, count } = await Notification.findAndCountAll({
    where, limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['created_at', 'DESC']], distinct: true,
  });
  return { rows, count, page: parseInt(page), limit: parseInt(limit) };
};

const getUnreadCount = async (userId) => {
  return Notification.count({ where: { user_id: userId, is_read: false } });
};

const markRead = async (id, userId) => {
  const notif = await Notification.findOne({ where: { id, user_id: userId } });
  if (!notif) throw { status: 404, message: 'Notification not found' };
  await notif.update({ is_read: true, read_at: new Date() });
  return notif;
};

const markAllRead = async (userId) => {
  await Notification.update({ is_read: true, read_at: new Date() }, { where: { user_id: userId, is_read: false } });
};

const remove = async (id, userId) => {
  const notif = await Notification.findOne({ where: { id, user_id: userId } });
  if (!notif) throw { status: 404, message: 'Notification not found' };
  await notif.destroy();
};

// Notify task assignment
const notifyTaskAssigned = async (task, assigneeId, assignerName) => {
  if (!assigneeId || assigneeId === task.reporter_id) return;
  await create({
    user_id: assigneeId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `${assignerName} assigned you task: "${task.title}"`,
    entity_type: 'task',
    entity_id: task.id,
    action_url: `/tasks/${task.id}`,
    priority: task.priority === 'critical' ? 'high' : 'medium',
  });
};

const notifyScopeChange = async (scope, changerName, projectMemberIds) => {
  for (const uid of projectMemberIds) {
    await create({
      user_id: uid,
      type: 'scope_change',
      title: 'Scope Updated',
      message: `${changerName} updated scope: "${scope.title}" (v${scope.current_version})`,
      entity_type: 'scope',
      entity_id: scope.id,
      action_url: `/scopes/${scope.id}`,
      priority: 'medium',
    });
  }
};

module.exports = { setSocketIO, create, broadcast, findAll, getUnreadCount, markRead, markAllRead, remove, notifyTaskAssigned, notifyScopeChange };
