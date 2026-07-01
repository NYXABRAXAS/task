'use strict';
const { sequelize } = require('../config/database');

// ── Import all models ──────────────────────────────────────────────────────
const Role             = require('./Role');
const Permission       = require('./Permission');
const RolePermission   = require('./RolePermission');
const Department       = require('./Department');
const User             = require('./User');
const UserRole         = require('./UserRole');
const LoginHistory     = require('./LoginHistory');
const Client           = require('./Client');
const Team             = require('./Team');
const TeamMember       = require('./TeamMember');
const Project          = require('./Project');
const ProjectMember    = require('./ProjectMember');
const Scope            = require('./Scope');
const ScopeVersion     = require('./ScopeVersion');
const Task             = require('./Task');
const TaskComment      = require('./TaskComment');
const TaskAttachment   = require('./TaskAttachment');
const TaskWorkLog      = require('./TaskWorkLog');
const Document         = require('./Document');
const Notification     = require('./Notification');
const AuditLog         = require('./AuditLog');

// ── Associations ──────────────────────────────────────────────────────────

// Role <-> Permission (M:M through RolePermission)
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'role_id', otherKey: 'permission_id', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permission_id', otherKey: 'role_id', as: 'roles' });

// User <-> Role (M:M through UserRole)
User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });

// User -> Department
Department.hasMany(User, { foreignKey: 'department_id', as: 'users' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// User -> LoginHistory
User.hasMany(LoginHistory, { foreignKey: 'user_id', as: 'loginHistory' });
LoginHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> AuditLog
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Client -> accountManager (User)
Client.belongsTo(User, { foreignKey: 'account_manager_id', as: 'accountManager' });
User.hasMany(Client, { foreignKey: 'account_manager_id', as: 'managedClients' });

// Client -> Project
Client.hasMany(Project, { foreignKey: 'client_id', as: 'projects' });
Project.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

// User -> Project (manager)
User.hasMany(Project, { foreignKey: 'manager_id', as: 'managedProjects' });
Project.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });

// Project -> ProjectMember
Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'members' });
ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'projectMemberships' });
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Project -> Scope
Project.hasMany(Scope, { foreignKey: 'project_id', as: 'scopes' });
Scope.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(Scope, { foreignKey: 'created_by', as: 'createdScopes' });
Scope.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Scope -> ScopeVersion
Scope.hasMany(ScopeVersion, { foreignKey: 'scope_id', as: 'versions' });
ScopeVersion.belongsTo(Scope, { foreignKey: 'scope_id', as: 'scope' });
User.hasMany(ScopeVersion, { foreignKey: 'created_by', as: 'scopeVersions' });
ScopeVersion.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Project -> Task
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Scope -> Task
Scope.hasMany(Task, { foreignKey: 'scope_id', as: 'tasks' });
Task.belongsTo(Scope, { foreignKey: 'scope_id', as: 'scope' });

// Task self-referential (subtasks)
Task.hasMany(Task, { foreignKey: 'parent_task_id', as: 'subtasks' });
Task.belongsTo(Task, { foreignKey: 'parent_task_id', as: 'parentTask' });

// Task -> assignee / reporter
User.hasMany(Task, { foreignKey: 'assignee_id', as: 'assignedTasks' });
Task.belongsTo(User, { foreignKey: 'assignee_id', as: 'assignee' });
User.hasMany(Task, { foreignKey: 'reporter_id', as: 'reportedTasks' });
Task.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

// Task -> TaskComment
Task.hasMany(TaskComment, { foreignKey: 'task_id', as: 'comments' });
TaskComment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskComment, { foreignKey: 'user_id', as: 'taskComments' });
TaskComment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Task -> TaskAttachment
Task.hasMany(TaskAttachment, { foreignKey: 'task_id', as: 'attachments' });
TaskAttachment.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskAttachment, { foreignKey: 'uploaded_by', as: 'taskAttachments' });
TaskAttachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// Task -> TaskWorkLog
Task.hasMany(TaskWorkLog, { foreignKey: 'task_id', as: 'workLogs' });
TaskWorkLog.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
User.hasMany(TaskWorkLog, { foreignKey: 'user_id', as: 'workLogs' });
TaskWorkLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Team -> teamLead (User)
Team.belongsTo(User, { foreignKey: 'team_lead_id', as: 'teamLead' });
User.hasMany(Team, { foreignKey: 'team_lead_id', as: 'ledTeams' });

// Team -> Department
Team.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Team, { foreignKey: 'department_id', as: 'teams' });

// Team -> createdBy (User)
Team.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });

// Team -> TeamMember
Team.hasMany(TeamMember, { foreignKey: 'team_id', as: 'members' });
TeamMember.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });
User.hasMany(TeamMember, { foreignKey: 'user_id', as: 'teamMemberships' });
TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Document
Project.hasMany(Document, { foreignKey: 'project_id', as: 'documents' });
Document.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
User.hasMany(Document, { foreignKey: 'uploaded_by', as: 'documents' });
Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// ── Export ─────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  Role, Permission, RolePermission,
  Department,
  User, UserRole, LoginHistory,
  Client,
  Team, TeamMember,
  Project, ProjectMember,
  Scope, ScopeVersion,
  Task, TaskComment, TaskAttachment, TaskWorkLog,
  Document,
  Notification,
  AuditLog,
};
