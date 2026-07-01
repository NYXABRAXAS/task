'use strict';
const { Team, TeamMember, User, Department } = require('../models');
const { Op } = require('sequelize');
const { success, created, error, paginated } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const { search, department_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (department_id) where.department_id = department_id;
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const { rows, count } = await Team.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'teamLead',
          attributes: ['id', 'first_name', 'last_name'],
          required: false,
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: TeamMember,
          as: 'members',
          where: { is_active: true },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name', 'avatar_url', 'designation'],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['name', 'ASC']],
      distinct: true,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    console.error('TEAM API ERROR [getAll]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const getOne = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'teamLead',
          attributes: ['id', 'first_name', 'last_name'],
          required: false,
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: TeamMember,
          as: 'members',
          where: { is_active: true },
          required: false,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name', 'email', 'avatar_url', 'designation'],
            },
          ],
        },
      ],
    });
    if (!team) return error(res, 'Team not found', 404);
    return success(res, team);
  } catch (err) {
    console.error('TEAM API ERROR [getOne]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const create = async (req, res) => {
  try {
    const { member_ids, ...teamData } = req.body;
    teamData.created_by = req.user.id;
    const team = await Team.create(teamData);

    if (member_ids && member_ids.length) {
      await TeamMember.bulkCreate(
        member_ids.map(uid => ({ team_id: team.id, user_id: uid })),
        { ignoreDuplicates: true }
      );
    }
    await req.auditLog({ action: 'CREATE', entityType: 'teams', entityId: team.id, entityName: team.name });
    return created(res, team, 'Team created');
  } catch (err) {
    console.error('TEAM API ERROR [create]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const update = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return error(res, 'Team not found', 404);
    await team.update(req.body);
    return success(res, team, 'Team updated');
  } catch (err) {
    console.error('TEAM API ERROR [update]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const addMember = async (req, res) => {
  try {
    const { user_id, role_in_team = 'member' } = req.body;
    const [member, wasCreated] = await TeamMember.findOrCreate({
      where: { team_id: req.params.id, user_id },
      defaults: { role_in_team },
    });
    if (!wasCreated) await member.update({ is_active: true, role_in_team });
    return success(res, member, 'Member added to team');
  } catch (err) {
    console.error('TEAM API ERROR [addMember]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const removeMember = async (req, res) => {
  try {
    const member = await TeamMember.findOne({
      where: { team_id: req.params.id, user_id: req.params.userId },
    });
    if (!member) return error(res, 'Member not in this team', 404);
    await member.update({ is_active: false, left_at: new Date() });
    return success(res, null, 'Member removed from team');
  } catch (err) {
    console.error('TEAM API ERROR [removeMember]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

const remove = async (req, res) => {
  try {
    const team = await Team.findByPk(req.params.id);
    if (!team) return error(res, 'Team not found', 404);
    await TeamMember.update({ is_active: false }, { where: { team_id: req.params.id } });
    await team.destroy();
    await req.auditLog({ action: 'DELETE', entityType: 'teams', entityId: parseInt(req.params.id), entityName: team.name });
    return success(res, null, 'Team deleted');
  } catch (err) {
    console.error('TEAM API ERROR [remove]:', err.message, '\nStack:', err.stack);
    return res.status(500).json({ success: false, message: err.message, stack: err.stack });
  }
};

module.exports = { getAll, getOne, create, update, addMember, removeMember, remove };
