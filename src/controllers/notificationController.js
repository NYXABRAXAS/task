'use strict';
const notificationService = require('../services/notificationService');
const { success, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { rows, count, page, limit } = await notificationService.findAll(req.user.id, req.query);
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({
      status: 'success', data: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
      unreadCount,
    });
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const markRead = async (req, res) => {
  try {
    const notif = await notificationService.markRead(req.params.id, req.user.id);
    return success(res, notif, 'Marked as read');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const markAllRead = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.id);
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    await notificationService.remove(req.params.id, req.user.id);
    return success(res, null, 'Notification deleted');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, markRead, markAllRead, remove };
