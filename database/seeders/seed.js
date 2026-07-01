'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { sequelize } = require('../../src/config/database');
const models = require('../../src/models');
const {
  Role, Permission, RolePermission, Department, User, UserRole,
  Client, Project, Team, TeamMember, Task, Scope, Notification,
} = models;
const logger = require('../../src/utils/logger');

// ── Permission matrix ──────────────────────────────────────────────────────
const MODULES = ['projects','scopes','tasks','users','clients','teams','documents','reports','audit_logs','notifications','roles','departments'];
const ACTIONS = ['create','read','update','delete','export','import','approve'];

const ROLE_PERMISSIONS = {
  super_admin: '*',
  admin: {
    projects:['create','read','update','delete','export'],
    scopes:  ['create','read','update','delete','approve','export'],
    tasks:   ['create','read','update','delete','export'],
    users:   ['create','read','update','delete'],
    clients: ['create','read','update','delete'],
    teams:   ['create','read','update','delete'],
    documents:['create','read','update','delete'],
    reports: ['read','export'],
    audit_logs:['read'],
    notifications:['read'],
    roles:   ['read','create','update'],
    departments:['create','read','update','delete'],
  },
  project_manager: {
    projects:['create','read','update','export'],
    scopes:  ['create','read','update','approve'],
    tasks:   ['create','read','update','delete'],
    clients: ['read'],
    teams:   ['read'],
    documents:['create','read','update','delete'],
    reports: ['read','export'],
    notifications:['read'],
    users:   ['read'],
  },
  scope_analyst: {
    projects:['read'],
    scopes:  ['create','read','update'],
    tasks:   ['read','update'],
    documents:['create','read'],
    reports: ['read'],
    notifications:['read'],
  },
  developer: {
    projects:['read'],
    scopes:  ['read'],
    tasks:   ['read','update'],
    documents:['read'],
    notifications:['read'],
    reports: ['read'],
  },
  qa_engineer: {
    projects:['read'],
    scopes:  ['read'],
    tasks:   ['read','update','create'],
    documents:['read','create'],
    notifications:['read'],
    reports: ['read'],
  },
  client_viewer: {
    projects:['read'],
    scopes:  ['read'],
    tasks:   ['read'],
    documents:['read'],
    notifications:['read'],
  },
};

const ROLES_META = [
  { name:'super_admin',     slug:'super_admin',     description:'Full system access',             is_system:true },
  { name:'admin',           slug:'admin',           description:'Administrative access',          is_system:true },
  { name:'project_manager', slug:'project_manager', description:'Manages projects and teams',     is_system:true },
  { name:'scope_analyst',   slug:'scope_analyst',   description:'Manages scope documents',        is_system:true },
  { name:'developer',       slug:'developer',       description:'Development team member',        is_system:true },
  { name:'qa_engineer',     slug:'qa_engineer',     description:'Quality assurance',              is_system:true },
  { name:'client_viewer',   slug:'client_viewer',   description:'Client portal read-only access', is_system:true },
];

const DEPARTMENTS_DATA = [
  { name:'Engineering',       code:'ENG' },
  { name:'Product',           code:'PRD' },
  { name:'Quality Assurance', code:'QA'  },
  { name:'Business Analysis', code:'BA'  },
  { name:'Management',        code:'MGT' },
  { name:'Client Services',   code:'CS'  },
];

const USERS_DATA = [
  { employee_id:'EMP001', first_name:'Super',   last_name:'Admin',   email:'superadmin@prohorizon.com', password_hash:'Admin@1234', role:'super_admin',     dept:'Management'       },
  { employee_id:'EMP002', first_name:'Admin',   last_name:'User',    email:'admin@prohorizon.com',      password_hash:'Admin@1234', role:'admin',           dept:'Management'       },
  { employee_id:'EMP003', first_name:'Rahul',   last_name:'Sharma',  email:'pm@prohorizon.com',         password_hash:'Admin@1234', role:'project_manager', dept:'Management'       },
  { employee_id:'EMP004', first_name:'Priya',   last_name:'Nair',    email:'analyst@prohorizon.com',    password_hash:'Admin@1234', role:'scope_analyst',   dept:'Business Analysis'},
  { employee_id:'EMP005', first_name:'Arun',    last_name:'Kumar',   email:'dev@prohorizon.com',        password_hash:'Admin@1234', role:'developer',       dept:'Engineering'      },
  { employee_id:'EMP006', first_name:'Sneha',   last_name:'Pillai',  email:'qa@prohorizon.com',         password_hash:'Admin@1234', role:'qa_engineer',     dept:'Quality Assurance'},
  { employee_id:'EMP007', first_name:'Muthoot', last_name:'Client',  email:'client@muthoot.com',        password_hash:'Admin@1234', role:'client_viewer',   dept:'Client Services'  },
];

const CLIENTS_DATA = [
  { company_name:'Muthoot Fincorp Ltd',     client_code:'CLT-0001', industry:'NBFC / Chit Fund',      contact_person:'George Thomas', contact_email:'george@muthoot.com',          city:'Kochi',    state:'Kerala',      portal_enabled:true  },
  { company_name:'ESAF Small Finance Bank', client_code:'CLT-0002', industry:'Banking / Vehicle Loan', contact_person:'Paul Mathew',   contact_email:'paul@esaf.com',               city:'Thrissur', state:'Kerala',      portal_enabled:true  },
  { company_name:'ICICI Bank Ltd',          client_code:'CLT-0003', industry:'Banking / Used Car LOS', contact_person:'Anita Rao',     contact_email:'anita@icici.com',             city:'Mumbai',   state:'Maharashtra', portal_enabled:false },
  { company_name:'Mahindra Finance',        client_code:'CLT-0004', industry:'NBFC / Tractor LOS',    contact_person:'Vikram Mehta',  contact_email:'vikram@mahindrafinance.com',  city:'Mumbai',   state:'Maharashtra', portal_enabled:false },
];

const PROJECTS_DATA = [
  { project_code:'PRJ-0001', name:'Muthoot Chit Fund Management System', category:'Chit Fund',    status:'active',   priority:'high',     health:'green', completion_percentage:65, start_date:'2025-01-15', end_date:'2025-12-31', budget:2500000 },
  { project_code:'PRJ-0002', name:'ESAF Vehicle Loan LOS',               category:'Vehicle Loan', status:'active',   priority:'critical', health:'amber', completion_percentage:42, start_date:'2025-03-01', end_date:'2025-11-30', budget:1800000 },
  { project_code:'PRJ-0003', name:'ICICI Used Car LOS',                  category:'Used Car LOS', status:'active',   priority:'high',     health:'green', completion_percentage:78, start_date:'2024-10-01', end_date:'2025-09-30', budget:3200000 },
  { project_code:'PRJ-0004', name:'Mahindra Tractor LOS',                category:'Tractor LOS',  status:'planning', priority:'medium',   health:'green', completion_percentage: 8, start_date:'2025-06-01', end_date:'2026-03-31', budget:2100000 },
];

async function seed() {
  try {
    logger.info('🌱  Seed: connecting to database...');
    await sequelize.authenticate();

    // Sync tables WITHOUT dropping (safe for cloud re-deploys)
    await sequelize.sync({ force: false, alter: false });
    logger.info('✅  Seed: schema ready');

    // ── 1. Permissions ────────────────────────────────────────────────────
    const permRecords = [];
    for (const mod of MODULES)
      for (const action of ACTIONS)
        permRecords.push({ module:mod, action, name:`${mod}:${action}`, description:`${action} on ${mod}` });

    await Permission.bulkCreate(permRecords, { ignoreDuplicates:true });
    const perms  = await Permission.findAll();
    const permMap = {};
    perms.forEach(p => { permMap[p.name] = p.id; });
    logger.info(`✅  Seed: ${perms.length} permissions`);

    // ── 2. Roles ──────────────────────────────────────────────────────────
    await Role.bulkCreate(ROLES_META, { ignoreDuplicates:true });
    const roles   = await Role.findAll();
    const roleMap = {};
    roles.forEach(r => { roleMap[r.name] = r; });
    logger.info(`✅  Seed: ${roles.length} roles`);

    // ── 3. Role-permissions ───────────────────────────────────────────────
    const rpRecords = [];
    for (const [roleName, matrix] of Object.entries(ROLE_PERMISSIONS)) {
      const role = roleMap[roleName];
      if (!role) continue;
      const permIds = matrix === '*'
        ? perms.map(p => p.id)
        : Object.entries(matrix).flatMap(([mod, actions]) =>
            actions.map(a => permMap[`${mod}:${a}`]).filter(Boolean));
      permIds.forEach(pid => rpRecords.push({ role_id:role.id, permission_id:pid }));
    }
    await RolePermission.bulkCreate(rpRecords, { ignoreDuplicates:true });
    logger.info('✅  Seed: role-permissions assigned');

    // ── 4. Departments ────────────────────────────────────────────────────
    await Department.bulkCreate(DEPARTMENTS_DATA, { ignoreDuplicates:true });
    const depts  = await Department.findAll();
    const deptMap = {};
    depts.forEach(d => { deptMap[d.name] = d.id; });
    logger.info(`✅  Seed: ${depts.length} departments`);

    // ── 5. Users ─────────────────────────────────────────────────────────
    const createdUsers = [];
    for (const u of USERS_DATA) {
      const [user, created] = await User.findOrCreate({
        where: { email: u.email },
        defaults: {
          employee_id:       u.employee_id,
          first_name:        u.first_name,
          last_name:         u.last_name,
          password_hash:     u.password_hash,
          department_id:     deptMap[u.dept] || null,
          is_active:         true,
          is_email_verified: true,
          designation:       u.role.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase()),
        },
      });
      if (created) {
        const role = roleMap[u.role];
        if (role) await UserRole.findOrCreate({ where:{ user_id:user.id, role_id:role.id } });
        logger.info(`  👤  Created: ${user.email}`);
      }
      createdUsers.push(user);
    }

    const pmUser      = createdUsers.find(u => u.email === 'pm@prohorizon.com');
    const devUser     = createdUsers.find(u => u.email === 'dev@prohorizon.com');
    const qaUser      = createdUsers.find(u => u.email === 'qa@prohorizon.com');
    const analystUser = createdUsers.find(u => u.email === 'analyst@prohorizon.com');
    const adminUser   = createdUsers.find(u => u.email === 'admin@prohorizon.com');

    // ── 6. Clients ────────────────────────────────────────────────────────
    for (const c of CLIENTS_DATA) {
      await Client.findOrCreate({
        where:    { client_code: c.client_code },
        defaults: { ...c, account_manager_id: pmUser?.id },
      });
    }
    logger.info(`✅  Seed: ${CLIENTS_DATA.length} clients`);

    // ── 7. Projects ───────────────────────────────────────────────────────
    const clientRows   = await Client.findAll({ order:[['id','ASC']] });
    const createdProjects = [];
    for (let i = 0; i < PROJECTS_DATA.length; i++) {
      const [proj] = await Project.findOrCreate({
        where:    { project_code: PROJECTS_DATA[i].project_code },
        defaults: {
          ...PROJECTS_DATA[i],
          client_id:   clientRows[i]?.id,
          manager_id:  pmUser?.id,
          created_by:  pmUser?.id,
        },
      });
      createdProjects.push(proj);
    }
    logger.info(`✅  Seed: ${createdProjects.length} projects`);

    // ── 8. Teams ─────────────────────────────────────────────────────────
    const teamsData = [
      { name:'Engineering Team',       description:'Full-stack development team',       team_lead_id:devUser?.id,     department_id:deptMap['Engineering'],       created_by:adminUser?.id },
      { name:'QA & Testing Team',      description:'Quality assurance and testing',     team_lead_id:qaUser?.id,      department_id:deptMap['Quality Assurance'], created_by:adminUser?.id },
      { name:'Business Analysis Team', description:'Requirements and scope analysis',   team_lead_id:analystUser?.id, department_id:deptMap['Business Analysis'], created_by:adminUser?.id },
    ];
    const createdTeams = [];
    for (const t of teamsData) {
      const [team] = await Team.findOrCreate({ where:{ name:t.name }, defaults:t });
      createdTeams.push(team);
    }
    logger.info(`✅  Seed: ${createdTeams.length} teams`);

    // ── 9. Team Members ───────────────────────────────────────────────────
    const tmData = [
      { team_id:createdTeams[0]?.id, user_id:devUser?.id,     role_in_team:'lead',   is_active:true, joined_at:'2025-01-15' },
      { team_id:createdTeams[0]?.id, user_id:pmUser?.id,      role_in_team:'member', is_active:true, joined_at:'2025-01-15' },
      { team_id:createdTeams[1]?.id, user_id:qaUser?.id,      role_in_team:'lead',   is_active:true, joined_at:'2025-01-15' },
      { team_id:createdTeams[1]?.id, user_id:analystUser?.id, role_in_team:'member', is_active:true, joined_at:'2025-02-01' },
      { team_id:createdTeams[2]?.id, user_id:analystUser?.id, role_in_team:'lead',   is_active:true, joined_at:'2025-01-15' },
      { team_id:createdTeams[2]?.id, user_id:pmUser?.id,      role_in_team:'member', is_active:true, joined_at:'2025-01-15' },
    ].filter(t => t.team_id && t.user_id);
    await TeamMember.bulkCreate(tmData, { ignoreDuplicates:true });
    logger.info('✅  Seed: team members');

    // ── 10. Tasks ─────────────────────────────────────────────────────────
    const now      = new Date();
    const ago  = d => new Date(now - d*86400000).toISOString().split('T')[0];
    const ahead= d => new Date(now.getTime() + d*86400000).toISOString().split('T')[0];

    const tasksData = [
      { task_code:'TSK-0001', title:'Chit Fund Module — Database Design',      project_id:createdProjects[0]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'done',        priority:'high',     task_type:'feature',  start_date:ago(90),  due_date:ago(60),   estimated_hours:24, completed_at:ago(62) },
      { task_code:'TSK-0002', title:'Member Enrollment API',                   project_id:createdProjects[0]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'done',        priority:'high',     task_type:'feature',  start_date:ago(60),  due_date:ago(30),   estimated_hours:32, completed_at:ago(31) },
      { task_code:'TSK-0003', title:'Instalment Collection UI',                project_id:createdProjects[0]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'in_progress', priority:'high',     task_type:'feature',  start_date:ago(20),  due_date:ahead(10), estimated_hours:40  },
      { task_code:'TSK-0004', title:'Chit Auction Workflow Testing',           project_id:createdProjects[0]?.id, assignee_id:qaUser?.id,      reporter_id:pmUser?.id, status:'testing',     priority:'medium',   task_type:'testing',  start_date:ago(10),  due_date:ahead(5),  estimated_hours:16  },
      { task_code:'TSK-0005', title:'Loan Origination — Requirements Analysis',project_id:createdProjects[1]?.id, assignee_id:analystUser?.id, reporter_id:pmUser?.id, status:'done',        priority:'critical', task_type:'analysis', start_date:ago(80),  due_date:ago(50),   estimated_hours:20, completed_at:ago(52)},
      { task_code:'TSK-0006', title:'Vehicle Valuation API Integration',       project_id:createdProjects[1]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'in_progress', priority:'critical', task_type:'feature',  start_date:ago(25),  due_date:ahead(7),  estimated_hours:48  },
      { task_code:'TSK-0007', title:'KYC Document Verification Module',        project_id:createdProjects[1]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'backlog',     priority:'high',     task_type:'feature',  start_date:ahead(5), due_date:ahead(30), estimated_hours:36  },
      { task_code:'TSK-0008', title:'Loan Application Performance Testing',    project_id:createdProjects[1]?.id, assignee_id:qaUser?.id,      reporter_id:pmUser?.id, status:'backlog',     priority:'medium',   task_type:'testing',  start_date:ahead(15),due_date:ahead(35), estimated_hours:24  },
      { task_code:'TSK-0009', title:'Used Car LOS — Core Engine',             project_id:createdProjects[2]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'done',        priority:'high',     task_type:'feature',  start_date:ago(120), due_date:ago(80),   estimated_hours:60, completed_at:ago(85)},
      { task_code:'TSK-0010', title:'Credit Scoring Integration',              project_id:createdProjects[2]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'done',        priority:'critical', task_type:'feature',  start_date:ago(80),  due_date:ago(40),   estimated_hours:40, completed_at:ago(42)},
      { task_code:'TSK-0011', title:'Dealer Portal — UI Completion',           project_id:createdProjects[2]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'in_progress', priority:'high',     task_type:'feature',  start_date:ago(15),  due_date:ahead(5),  estimated_hours:28  },
      { task_code:'TSK-0012', title:'End-to-End Regression Testing',           project_id:createdProjects[2]?.id, assignee_id:qaUser?.id,      reporter_id:pmUser?.id, status:'todo',        priority:'high',     task_type:'testing',  start_date:ahead(5), due_date:ahead(20), estimated_hours:32  },
      { task_code:'TSK-0013', title:'Tractor LOS — Scope Definition',          project_id:createdProjects[3]?.id, assignee_id:analystUser?.id, reporter_id:pmUser?.id, status:'done',        priority:'high',     task_type:'analysis', start_date:ago(30),  due_date:ago(15),   estimated_hours:16, completed_at:ago(16)},
      { task_code:'TSK-0014', title:'Tractor Loan Application Form — Design',  project_id:createdProjects[3]?.id, assignee_id:devUser?.id,     reporter_id:pmUser?.id, status:'in_progress', priority:'medium',   task_type:'feature',  start_date:ago(5),   due_date:ahead(20), estimated_hours:24  },
      { task_code:'TSK-0015', title:'Farm Bureau API Integration Research',    project_id:createdProjects[3]?.id, assignee_id:analystUser?.id, reporter_id:pmUser?.id, status:'backlog',     priority:'low',      task_type:'research', start_date:ahead(10),due_date:ahead(40), estimated_hours:12  },
    ].filter(t => t.project_id && t.assignee_id);
    await Task.bulkCreate(tasksData, { ignoreDuplicates:true });
    logger.info(`✅  Seed: ${tasksData.length} tasks`);

    // ── 11. Notifications ─────────────────────────────────────────────────
    if (devUser && pmUser) {
      const notifData = [
        { user_id:devUser.id,  type:'task_assigned',  title:'New Task Assigned',       message:'You have been assigned: Instalment Collection UI',         is_read:false },
        { user_id:devUser.id,  type:'task_due',       title:'Task Due Soon',           message:'TSK-0006 is due in 7 days — Vehicle Valuation API',         is_read:false },
        { user_id:pmUser.id,   type:'project_update', title:'Project Health Changed',  message:'ESAF Vehicle Loan LOS health changed to AMBER',             is_read:false },
        { user_id:qaUser?.id,  type:'task_assigned',  title:'QA Task Assigned',        message:'Please begin testing: Chit Auction Workflow Testing',       is_read:false },
        { user_id:devUser.id,  type:'system',         title:'Welcome to ProHorizon!',  message:'Your account has been configured. Start exploring the app.', is_read:true  },
      ].filter(n => n.user_id);
      await Notification.bulkCreate(notifData, { ignoreDuplicates:true });
      logger.info('✅  Seed: notifications');
    }

    logger.info('\n🎉  Database seeded successfully!\n');
    logger.info('   Default credentials (change after first login):');
    logger.info('   superadmin@prohorizon.com  /  Admin@1234  (Super Admin)');
    logger.info('   admin@prohorizon.com       /  Admin@1234  (Admin)');
    logger.info('   pm@prohorizon.com          /  Admin@1234  (Project Manager)\n');

  } catch (err) {
    logger.error(`❌  Seed failed: ${err.message}`);
    logger.error(err.stack);
    throw err;
  }
}

// ── Allow direct CLI execution OR import as module ─────────────────────────
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seed;
