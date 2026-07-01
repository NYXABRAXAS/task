'use strict';
const { Task, Project, Scope, User, TaskComment, TaskAttachment, TaskWorkLog, sequelize } = require('../models');
const { Op } = require('sequelize');

const baseIncludes = [
  { model: User, as: 'assignee', attributes: ['id', 'first_name', 'last_name', 'avatar_url'] },
  { model: User, as: 'reporter', attributes: ['id', 'first_name', 'last_name'] },
  { model: Project, as: 'project', attributes: ['id', 'name', 'project_code'] },
  { model: Scope, as: 'scope', attributes: ['id', 'title'] },
];

const findAll = async (query = {}) => {
  const { project_id, scope_id, assignee_id, status, priority, task_type, search, sprint, due_before, page = 1, limit = 50 } = query;
  const where = {};
  if (project_id) where.project_id = project_id;
  if (scope_id) where.scope_id = scope_id;
  if (assignee_id) where.assignee_id = assignee_id;
  if (status) where.status = Array.isArray(status) ? { [Op.in]: status } : status;
  if (priority) where.priority = priority;
  if (task_type) where.task_type = task_type;
  if (sprint) where.sprint = sprint;
  if (due_before) where.due_date = { [Op.lte]: new Date(due_before) };
  if (search) where.title = { [Op.iLike]: `%${search}%` };

  const { rows, count } = await Task.findAndCountAll({
    where, include: baseIncludes,
    limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['position', 'ASC'], ['created_at', 'DESC']], distinct: true,
  });
  return { rows, count, page: parseInt(page), limit: parseInt(limit) };
};

const findById = async (id) => {
  const task = await Task.findByPk(id, {
    include: [
      ...baseIncludes,
      {
        model: TaskComment, as: 'comments', required: false,
        include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'avatar_url'] }],
        order: [['created_at', 'ASC']],
      },
      { model: TaskAttachment, as: 'attachments', required: false,
        include: [{ model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }],
      },
      { model: Task, as: 'subtasks', required: false, include: baseIncludes },
    ],
  });
  if (!task) throw { status: 404, message: 'Task not found' };
  return task;
};

const create = async (data, createdById) => {
  data.created_by = createdById;
  if (!data.reporter_id) data.reporter_id = createdById;

  const project = await Project.findByPk(data.project_id);
  if (!project) throw { status: 404, message: 'Project not found' };

  // Auto-generate task code
  const count = await Task.count({ where: { project_id: data.project_id } });
  data.task_code = `${project.project_code}-${String(count + 1).padStart(3, '0')}`;

  // Position at end of column
  const lastInColumn = await Task.findOne({ where: { project_id: data.project_id, status: data.status || 'backlog' }, order: [['position', 'DESC']] });
  data.position = lastInColumn ? lastInColumn.position + 1 : 0;

  const task = await Task.create(data);
  return findById(task.id);
};

const update = async (id, data) => {
  const task = await Task.findByPk(id);
  if (!task) throw { status: 404, message: 'Task not found' };

  const oldValues = task.toJSON();

  if (data.status === 'done' && !task.completed_at) {
    data.completed_at = new Date();
  }

  await task.update(data);

  // Update project completion % after task status change
  if (data.status) await recalculateProjectCompletion(task.project_id);

  return { task: await findById(id), oldValues };
};

const moveKanban = async (id, { status, position }) => {
  const task = await Task.findByPk(id);
  if (!task) throw { status: 404, message: 'Task not found' };
  await task.update({ status, position });
  if (status === 'done' && !task.completed_at) await task.update({ completed_at: new Date() });
  await recalculateProjectCompletion(task.project_id);
};

const remove = async (id) => {
  const task = await Task.findByPk(id);
  if (!task) throw { status: 404, message: 'Task not found' };
  await task.update({ status: 'cancelled' });
};

const recalculateProjectCompletion = async (projectId) => {
  const [result] = await sequelize.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'done') as done
    FROM tasks WHERE project_id = :projectId AND status != 'cancelled'
  `, { replacements: { projectId }, type: sequelize.QueryTypes.SELECT });

  if (result.total > 0) {
    const pct = Math.round((result.done / result.total) * 100);
    const { Project } = require('../models');
    await Project.update({ completion_percentage: pct }, { where: { id: projectId } });
  }
};

// ── Comments ──────────────────────────────────────────────────────────────
const addComment = async (taskId, userId, content) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };
  const comment = await TaskComment.create({ task_id: taskId, user_id: userId, content });
  return TaskComment.findByPk(comment.id, {
    include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'avatar_url'] }],
  });
};

const updateComment = async (commentId, userId, content) => {
  const comment = await TaskComment.findByPk(commentId);
  if (!comment) throw { status: 404, message: 'Comment not found' };
  if (comment.user_id !== userId) throw { status: 403, message: 'Cannot edit another user\'s comment' };
  await comment.update({ content, is_edited: true, edited_at: new Date() });
  return comment;
};

const deleteComment = async (commentId, userId, userRoles) => {
  const comment = await TaskComment.findByPk(commentId);
  if (!comment) throw { status: 404, message: 'Comment not found' };
  const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
  if (comment.user_id !== userId && !isAdmin) throw { status: 403, message: 'Cannot delete another user\'s comment' };
  await comment.destroy();
};

// ── Work Logs ─────────────────────────────────────────────────────────────
const logWork = async (taskId, userId, { hours_logged, work_date, description, billable = true }) => {
  const task = await Task.findByPk(taskId);
  if (!task) throw { status: 404, message: 'Task not found' };

  const log = await TaskWorkLog.create({ task_id: taskId, user_id: userId, hours_logged, work_date, description, billable });

  // Update total logged hours
  const total = await TaskWorkLog.sum('hours_logged', { where: { task_id: taskId } });
  await task.update({ logged_hours: total });

  return log;
};

const getWorkLogs = async (taskId) => {
  return TaskWorkLog.findAll({
    where: { task_id: taskId },
    include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
    order: [['work_date', 'DESC']],
  });
};

module.exports = { findAll, findById, create, update, moveKanban, remove, addComment, updateComment, deleteComment, logWork, getWorkLogs };
