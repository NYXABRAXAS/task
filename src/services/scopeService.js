'use strict';
const { Scope, ScopeVersion, Project, User } = require('../models');
const { Op } = require('sequelize');

const baseIncludes = [
  { model: Project, as: 'project', attributes: ['id', 'name', 'project_code'] },
  { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
];

const findAll = async ({ project_id, status, search, page = 1, limit = 20 } = {}) => {
  const where = {};
  if (project_id) where.project_id = project_id;
  if (status) where.status = status;
  if (search) where.title = { [Op.iLike]: `%${search}%` };

  const { rows, count } = await Scope.findAndCountAll({
    where, include: baseIncludes,
    limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['created_at', 'DESC']], distinct: true,
  });
  return { rows, count, page: parseInt(page), limit: parseInt(limit) };
};

const findById = async (id) => {
  const scope = await Scope.findByPk(id, {
    include: [
      ...baseIncludes,
      {
        model: ScopeVersion, as: 'versions',
        include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['version', 'DESC']],
      },
    ],
  });
  if (!scope) throw { status: 404, message: 'Scope not found' };
  return scope;
};

const create = async (data, createdById) => {
  data.created_by = createdById;

  const project = await Project.findByPk(data.project_id);
  if (!project) throw { status: 404, message: 'Project not found' };

  const scope = await Scope.create(data);

  // Create initial version snapshot
  await ScopeVersion.create({
    scope_id: scope.id,
    version: '1.0',
    title: scope.title,
    description: scope.description,
    snapshot: scope.toJSON(),
    change_summary: 'Initial version',
    change_type: 'initial',
    created_by: createdById,
  });

  return findById(scope.id);
};

const update = async (id, data, updatedById, changeSummary) => {
  const scope = await Scope.findByPk(id);
  if (!scope) throw { status: 404, message: 'Scope not found' };

  const oldSnapshot = scope.toJSON();

  // Calculate next version
  const latestVersion = await ScopeVersion.findOne({ where: { scope_id: id }, order: [['version', 'DESC']] });
  const [major, minor] = (latestVersion?.version || '1.0').split('.').map(Number);
  const newVersion = data.change_type === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`;
  data.current_version = newVersion;

  await scope.update(data);

  // Version snapshot
  await ScopeVersion.create({
    scope_id: scope.id,
    version: newVersion,
    title: scope.title,
    description: scope.description,
    snapshot: scope.toJSON(),
    change_summary: changeSummary || 'Updated',
    change_type: data.change_type || 'minor',
    created_by: updatedById,
  });

  return { scope: await findById(id), oldValues: oldSnapshot };
};

const approve = async (id, approverId) => {
  const scope = await Scope.findByPk(id);
  if (!scope) throw { status: 404, message: 'Scope not found' };
  if (scope.status === 'approved') throw { status: 400, message: 'Scope is already approved' };
  await scope.update({ status: 'approved', approved_by: approverId, approved_at: new Date() });
  return findById(id);
};

const reject = async (id, reason) => {
  const scope = await Scope.findByPk(id);
  if (!scope) throw { status: 404, message: 'Scope not found' };
  await scope.update({ status: 'rejected', change_reason: reason });
  return findById(id);
};

const getVersionHistory = async (id) => {
  return ScopeVersion.findAll({
    where: { scope_id: id },
    include: [{ model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }],
    order: [['version', 'DESC']],
  });
};

const remove = async (id, deletedById) => {
  const scope = await Scope.findByPk(id);
  if (!scope) throw { status: 404, message: 'Scope not found' };
  if (scope.status === 'approved') throw { status: 400, message: 'Cannot delete an approved scope' };
  await scope.update({ status: 'cancelled' });
};

module.exports = { findAll, findById, create, update, approve, reject, getVersionHistory, remove };
