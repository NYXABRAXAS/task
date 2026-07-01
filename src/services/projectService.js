'use strict';
const { Project, Client, User, ProjectMember, Scope, Task, sequelize } = require('../models');
const { Op } = require('sequelize');

const baseIncludes = [
  { model: Client, as: 'client', attributes: ['id', 'company_name', 'client_code'] },
  { model: User, as: 'manager', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url'] },
];

const findAll = async (query = {}, userId, userRoles) => {
  const { search, status, client_id, priority, health, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = query;
  const where = {};

  if (search) where.name = { [Op.iLike]: `%${search}%` };
  if (status) where.status = status;
  if (client_id) where.client_id = client_id;
  if (priority) where.priority = priority;
  if (health) where.health = health;

  // Non-admins only see projects they're members of
  if (!userRoles.includes('super_admin') && !userRoles.includes('admin')) {
    const memberships = await ProjectMember.findAll({ where: { user_id: userId, is_active: true }, attributes: ['project_id'] });
    const projectIds = memberships.map(m => m.project_id);
    where.id = { [Op.in]: projectIds };
  }

  const validSortFields = ['created_at', 'name', 'start_date', 'end_date', 'completion_percentage', 'priority'];
  const sortField = validSortFields.includes(sort) ? sort : 'created_at';

  const { rows, count } = await Project.findAndCountAll({
    where,
    include: baseIncludes,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [[sortField, order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
    distinct: true,
  });

  return { rows, count, page: parseInt(page), limit: parseInt(limit) };
};

const findById = async (id) => {
  const project = await Project.findByPk(id, {
    include: [
      ...baseIncludes,
      {
        model: ProjectMember, as: 'members',
        where: { is_active: true }, required: false,
        include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url', 'designation'] }],
      },
    ],
  });
  if (!project) throw { status: 404, message: 'Project not found' };
  return project;
};

const create = async (data, createdById) => {
  const { member_ids, ...projectData } = data;
  projectData.created_by = createdById;

  // Generate project code if not provided
  if (!projectData.project_code) {
    const count = await Project.count();
    projectData.project_code = `PRJ-${String(count + 1).padStart(4, '0')}`;
  }

  const project = await Project.create(projectData);

  // Add creator as manager-level member
  await ProjectMember.create({ project_id: project.id, user_id: createdById, role: 'manager' });

  if (member_ids && member_ids.length > 0) {
    const members = member_ids
      .filter(id => id !== createdById)
      .map(id => ({ project_id: project.id, user_id: id, role: 'member' }));
    if (members.length > 0) await ProjectMember.bulkCreate(members, { ignoreDuplicates: true });
  }

  return findById(project.id);
};

const update = async (id, data) => {
  const project = await Project.findByPk(id);
  if (!project) throw { status: 404, message: 'Project not found' };
  await project.update(data);
  return findById(project.id);
};

const remove = async (id) => {
  const project = await Project.findByPk(id);
  if (!project) throw { status: 404, message: 'Project not found' };

  const activeTasks = await Task.count({ where: { project_id: id, status: { [Op.notIn]: ['done', 'cancelled'] } } });
  if (activeTasks > 0) throw { status: 400, message: `Cannot delete project with ${activeTasks} active task(s). Complete or cancel them first.` };

  await project.update({ status: 'cancelled' }); // Soft delete via status
};

const addMember = async (projectId, { user_id, role = 'member' }) => {
  const project = await Project.findByPk(projectId);
  if (!project) throw { status: 404, message: 'Project not found' };
  const user = await User.findByPk(user_id);
  if (!user) throw { status: 404, message: 'User not found' };

  const [member, created] = await ProjectMember.findOrCreate({
    where: { project_id: projectId, user_id },
    defaults: { role },
  });
  if (!created) await member.update({ is_active: true, role });
  return member;
};

const removeMember = async (projectId, userId) => {
  const member = await ProjectMember.findOne({ where: { project_id: projectId, user_id: userId } });
  if (!member) throw { status: 404, message: 'Member not found in this project' };
  await member.update({ is_active: false, left_at: new Date() });
};

const getStats = async (projectId) => {
  const [taskStats] = await sequelize.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'done') as completed,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE status = 'backlog') as backlog,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done','cancelled')) as overdue,
      COALESCE(SUM(logged_hours), 0) as total_logged_hours,
      COALESCE(SUM(estimated_hours), 0) as total_estimated_hours
    FROM tasks WHERE project_id = :projectId AND status != 'cancelled'
  `, { replacements: { projectId }, type: sequelize.QueryTypes.SELECT });

  const [scopeStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'draft') as draft
    FROM scopes WHERE project_id = :projectId
  `, { replacements: { projectId }, type: sequelize.QueryTypes.SELECT });

  return { tasks: taskStats, scopes: scopeStats };
};

module.exports = { findAll, findById, create, update, remove, addMember, removeMember, getStats };
