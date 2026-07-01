'use strict';
const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { User } = require('../models');
const { success, created, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { rows, count, page, limit } = await taskService.findAll(req.query);
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getOne = async (req, res) => {
  try {
    const task = await taskService.findById(req.params.id);
    return success(res, task);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const create = async (req, res) => {
  try {
    const task = await taskService.create(req.body, req.user.id);
    await req.auditLog({ action: 'CREATE', entityType: 'tasks', entityId: task.id, entityName: task.title, newValues: req.body });

    // Notify assignee
    if (task.assignee_id && task.assignee_id !== req.user.id) {
      await notificationService.notifyTaskAssigned(task, task.assignee_id, req.user.getFullName());
      try {
        const assignee = await User.findByPk(task.assignee_id);
        if (assignee) {
          await emailService.sendTaskAssignment({
            email: assignee.email,
            name: assignee.getFullName(),
            taskTitle: task.title,
            projectName: task.project?.name,
            dueDate: task.due_date,
            assignerName: req.user.getFullName(),
          });
        }
      } catch (e) { /* non-critical */ }
    }

    return created(res, task, 'Task created');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const { task, oldValues } = await taskService.update(req.params.id, req.body);
    await req.auditLog({ action: 'UPDATE', entityType: 'tasks', entityId: task.id, entityName: task.title, oldValues, newValues: req.body });

    // Notify on reassignment
    if (req.body.assignee_id && req.body.assignee_id !== oldValues.assignee_id) {
      await notificationService.notifyTaskAssigned(task, req.body.assignee_id, req.user.getFullName());
    }

    return success(res, task, 'Task updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const moveKanban = async (req, res) => {
  try {
    await taskService.moveKanban(req.params.id, req.body);
    return success(res, null, 'Task moved');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    await taskService.remove(req.params.id);
    await req.auditLog({ action: 'DELETE', entityType: 'tasks', entityId: parseInt(req.params.id) });
    return success(res, null, 'Task cancelled');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

// Comments
const addComment = async (req, res) => {
  try {
    const comment = await taskService.addComment(req.params.id, req.user.id, req.body.content);
    return created(res, comment, 'Comment added');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const updateComment = async (req, res) => {
  try {
    const comment = await taskService.updateComment(req.params.commentId, req.user.id, req.body.content);
    return success(res, comment, 'Comment updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const deleteComment = async (req, res) => {
  try {
    await taskService.deleteComment(req.params.commentId, req.user.id, req.userRoles);
    return success(res, null, 'Comment deleted');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

// Work logs
const logWork = async (req, res) => {
  try {
    const log = await taskService.logWork(req.params.id, req.user.id, req.body);
    return created(res, log, 'Work logged');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getWorkLogs = async (req, res) => {
  try {
    const logs = await taskService.getWorkLogs(req.params.id);
    return success(res, logs);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

// Attachments
const addAttachment = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return error(res, 'No files uploaded', 400);
    const { TaskAttachment } = require('../models');
    const attachments = await Promise.all(req.files.map(f => TaskAttachment.create({
      task_id: req.params.id,
      uploaded_by: req.user.id,
      file_name: f.filename,
      original_name: f.originalname,
      file_path: f.path,
      file_size: f.size,
      mime_type: f.mimetype,
    })));
    return created(res, attachments, 'Attachments uploaded');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getOne, create, update, moveKanban, remove, addComment, updateComment, deleteComment, logWork, getWorkLogs, addAttachment };
