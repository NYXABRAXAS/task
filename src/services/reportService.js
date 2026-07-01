'use strict';
const { sequelize, Project, Task, Scope, User, Client, TaskWorkLog } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ── Dashboard summary ──────────────────────────────────────────────────────
const getDashboardStats = async () => {
  const [projects] = await sequelize.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold,
      COUNT(*) FILTER (WHERE health = 'red') as at_risk,
      ROUND(AVG(completion_percentage), 1) as avg_completion
    FROM projects WHERE status != 'cancelled'
  `, { type: sequelize.QueryTypes.SELECT });

  const [tasks] = await sequelize.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'done') as completed,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done','cancelled')) as overdue
    FROM tasks WHERE status != 'cancelled'
  `, { type: sequelize.QueryTypes.SELECT });

  const [resources] = await sequelize.query(`
    SELECT COUNT(*) as total_users, COUNT(*) FILTER (WHERE is_active) as active_users FROM users
  `, { type: sequelize.QueryTypes.SELECT });

  const [worklog] = await sequelize.query(`
    SELECT COALESCE(SUM(hours_logged), 0) as total_hours_this_month
    FROM task_work_logs WHERE work_date >= DATE_TRUNC('month', NOW())
  `, { type: sequelize.QueryTypes.SELECT });

  // Chart queries
  const projectStatusRows = await sequelize.query(`
    SELECT status, COUNT(*) as cnt FROM projects
    WHERE status != 'cancelled' GROUP BY status ORDER BY cnt DESC
  `, { type: sequelize.QueryTypes.SELECT });

  const taskStatusRows = await sequelize.query(`
    SELECT status, COUNT(*) as cnt FROM tasks
    WHERE status != 'cancelled' GROUP BY status ORDER BY cnt DESC
  `, { type: sequelize.QueryTypes.SELECT });

  const deliveryTrendRows = await sequelize.query(`
    SELECT TO_CHAR(DATE_TRUNC('month', completed_at), 'Mon') as month,
           COUNT(*) as actual
    FROM tasks WHERE completed_at IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', completed_at), month
    ORDER BY DATE_TRUNC('month', completed_at)
  `, { type: sequelize.QueryTypes.SELECT });

  const projectCompletionRows = await sequelize.query(`
    SELECT name, COALESCE(completion_percentage, 0) as pct
    FROM projects WHERE status != 'cancelled'
    ORDER BY completion_percentage DESC LIMIT 8
  `, { type: sequelize.QueryTypes.SELECT });

  const toNum = (v) => v === null || v === undefined ? 0 : Number(v);
  const p = projects || {};
  const t = tasks || {};
  const r = resources || {};
  const w = worklog || {};

  // Build chart objects
  const projectStatusChart = {};
  projectStatusRows.forEach(function(row) { projectStatusChart[row.status] = toNum(row.cnt); });

  const taskStatusChart = {};
  taskStatusRows.forEach(function(row) { taskStatusChart[row.status] = toNum(row.cnt); });

  const deliveryTrendChart = {
    labels:  deliveryTrendRows.map(function(row) { return row.month; }),
    planned: deliveryTrendRows.map(function() { return 0; }),
    actual:  deliveryTrendRows.map(function(row) { return toNum(row.actual); }),
  };

  const projectCompletionChart = {
    labels: projectCompletionRows.map(function(row) { return row.name; }),
    values: projectCompletionRows.map(function(row) { return toNum(row.pct); }),
  };

  return {
    projects: {
      total:          toNum(p.total),
      active:         toNum(p.active),
      completed:      toNum(p.completed),
      on_hold:        toNum(p.on_hold),
      at_risk:        toNum(p.at_risk),
      avg_completion: toNum(p.avg_completion),
    },
    tasks: {
      total:       toNum(t.total),
      completed:   toNum(t.completed),
      in_progress: toNum(t.in_progress),
      overdue:     toNum(t.overdue),
    },
    resources: {
      total_users:  toNum(r.total_users),
      active_users: toNum(r.active_users),
    },
    worklog: {
      total_hours_this_month: toNum(w.total_hours_this_month),
    },
    charts: {
      projectStatus:     projectStatusChart,
      taskStatus:        taskStatusChart,
      deliveryTrend:     deliveryTrendChart,
      projectCompletion: projectCompletionChart,
    },
  };
};

const getProjectHealthReport = async () => {
  return sequelize.query(`
    SELECT p.id, p.project_code, p.name, p.status, p.health, p.completion_percentage,
      p.start_date, p.end_date, p.budget, p.budget_spent,
      c.company_name as client_name,
      CONCAT(u.first_name, ' ', u.last_name) as manager_name,
      COUNT(t.id) as total_tasks,
      COUNT(t.id) FILTER (WHERE t.status = 'done') as done_tasks,
      COUNT(t.id) FILTER (WHERE t.due_date < NOW() AND t.status NOT IN ('done','cancelled')) as overdue_tasks
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN users u ON u.id = p.manager_id
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.status != 'cancelled'
    GROUP BY p.id, c.company_name, u.first_name, u.last_name
    ORDER BY p.health DESC, p.name ASC
  `, { type: sequelize.QueryTypes.SELECT });
};

const getTaskDeliveryTrend = async (months = 6) => {
  return sequelize.query(`
    SELECT
      DATE_TRUNC('month', completed_at) as month,
      COUNT(*) as completed_tasks
    FROM tasks
    WHERE completed_at IS NOT NULL
      AND completed_at >= NOW() - INTERVAL '${months} months'
    GROUP BY 1 ORDER BY 1
  `, { type: sequelize.QueryTypes.SELECT });
};

const getScopeChangeReport = async (projectId) => {
  const where = projectId ? `WHERE s.project_id = ${parseInt(projectId)}` : '';
  return sequelize.query(`
    SELECT s.id, s.title, s.status, s.current_version, p.name as project_name,
      COUNT(sv.id) as version_count
    FROM scopes s
    LEFT JOIN projects p ON p.id = s.project_id
    LEFT JOIN scope_versions sv ON sv.scope_id = s.id
    ${where}
    GROUP BY s.id, p.name ORDER BY version_count DESC
  `, { type: sequelize.QueryTypes.SELECT });
};

const getTeamWorklogReport = async ({ from_date, to_date } = {}) => {
  const from = from_date || new Date(new Date().setDate(1));
  const to = to_date || new Date();
  return sequelize.query(`
    SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) as name,
      u.designation, d.name as department,
      COALESCE(SUM(wl.hours_logged), 0) as total_hours,
      COUNT(DISTINCT t.project_id) as projects_contributed
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN task_work_logs wl ON wl.user_id = u.id AND wl.work_date BETWEEN :from AND :to
    LEFT JOIN tasks t ON t.id = wl.task_id
    WHERE u.is_active = true
    GROUP BY u.id, d.name ORDER BY total_hours DESC
  `, { replacements: { from, to }, type: sequelize.QueryTypes.SELECT });
};

// ── Excel Export ──────────────────────────────────────────────────────────
const exportProjectsToExcel = async () => {
  const data = await getProjectHealthReport();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ProHorizon Scope Tracker';
  const ws = wb.addWorksheet('Projects');

  ws.columns = [
    { header: 'Code',          key: 'project_code',          width: 12 },
    { header: 'Project Name',  key: 'name',                  width: 30 },
    { header: 'Client',        key: 'client_name',            width: 25 },
    { header: 'Manager',       key: 'manager_name',           width: 20 },
    { header: 'Status',        key: 'status',                 width: 12 },
    { header: 'Health',        key: 'health',                 width: 10 },
    { header: 'Completion %',  key: 'completion_percentage',  width: 15 },
    { header: 'Start Date',    key: 'start_date',             width: 12 },
    { header: 'End Date',      key: 'end_date',               width: 12 },
    { header: 'Budget',        key: 'budget',                 width: 15 },
    { header: 'Spent',         key: 'budget_spent',           width: 15 },
    { header: 'Total Tasks',   key: 'total_tasks',            width: 12 },
    { header: 'Done Tasks',    key: 'done_tasks',             width: 12 },
    { header: 'Overdue Tasks', key: 'overdue_tasks',          width: 14 },
  ];

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5BDB' } };

  data.forEach(function(row) { ws.addRow(row); });

  ws.eachRow(function(row, rowNum) {
    if (rowNum === 1) return;
    const health = row.getCell('health').value;
    const color = health === 'green' ? 'FF2E7D32' : health === 'amber' ? 'FFF57F17' : 'FFC62828';
    row.getCell('health').font = { color: { argb: color }, bold: true };
  });

  return wb;
};

const exportTasksToExcel = async (projectId) => {
  const where = projectId ? { project_id: projectId } : {};
  const tasks = await Task.findAll({
    where,
    include: [
      { model: User, as: 'assignee', attributes: ['first_name', 'last_name'] },
      { model: Project, as: 'project', attributes: ['name', 'project_code'] },
    ],
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tasks');
  ws.columns = [
    { header: 'Task Code',    key: 'task_code',        width: 15 },
    { header: 'Title',        key: 'title',            width: 35 },
    { header: 'Project',      key: 'project',          width: 20 },
    { header: 'Status',       key: 'status',           width: 15 },
    { header: 'Priority',     key: 'priority',         width: 10 },
    { header: 'Type',         key: 'task_type',        width: 15 },
    { header: 'Assignee',     key: 'assignee',         width: 20 },
    { header: 'Start Date',   key: 'start_date',       width: 12 },
    { header: 'Due Date',     key: 'due_date',         width: 12 },
    { header: 'Est. Hours',   key: 'estimated_hours',  width: 12 },
    { header: 'Logged Hours', key: 'logged_hours',     width: 14 },
    { header: 'Sprint',       key: 'sprint',           width: 15 },
  ];

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };

  tasks.forEach(function(t) {
    ws.addRow({
      task_code: t.task_code, title: t.title,
      project: t.project ? (t.project.project_code + ' - ' + t.project.name) : '',
      status: t.status, priority: t.priority, task_type: t.task_type,
      assignee: t.assignee ? (t.assignee.first_name + ' ' + t.assignee.last_name) : 'Unassigned',
      start_date: t.start_date, due_date: t.due_date,
      estimated_hours: t.estimated_hours, logged_hours: t.logged_hours, sprint: t.sprint,
    });
  });

  return wb;
};

// ── PDF Export ────────────────────────────────────────────────────────────
const exportProjectToPDF = async (projectId) => {
  const project = await Project.findByPk(projectId, {
    include: [
      { model: Client, as: 'client' },
      { model: User, as: 'manager' },
    ],
  });
  if (!project) throw { status: 404, message: 'Project not found' };

  const [stats] = await sequelize.query(`
    SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='done') as done,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('done','cancelled')) as overdue
    FROM tasks WHERE project_id = :pid AND status != 'cancelled'
  `, { replacements: { pid: projectId }, type: sequelize.QueryTypes.SELECT });

  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).fillColor('#3B5BDB').text('ProHorizon Scope Tracker', { align: 'center' });
  doc.fontSize(14).fillColor('#333').text('Project Report', { align: 'center' });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#3B5BDB');
  doc.moveDown();

  doc.fontSize(12).fillColor('#3B5BDB').text('Project Details', { underline: true });
  doc.fillColor('#333');
  doc.fontSize(10);
  const details = [
    ['Name', project.name], ['Code', project.project_code],
    ['Client',   project.client  ? project.client.company_name                              : 'N/A'],
    ['Manager',  project.manager ? (project.manager.first_name + ' ' + project.manager.last_name) : 'N/A'],
    ['Status', project.status], ['Health', project.health],
    ['Start', project.start_date || 'N/A'], ['End', project.end_date || 'N/A'],
    ['Budget', project.budget ? ('INR ' + Number(project.budget).toLocaleString('en-IN')) : 'N/A'],
  ];
  details.forEach(function(pair) {
    doc.text(pair[0] + ': ', { continued: true }).fillColor('#555').text(String(pair[1])).fillColor('#333');
  });

  doc.moveDown();
  doc.fontSize(12).fillColor('#3B5BDB').text('Task Summary', { underline: true });
  doc.fillColor('#333').fontSize(10);
  doc.text('Total: ' + stats.total + ' | Completed: ' + stats.done + ' | Overdue: ' + stats.overdue);

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#aaa').text(
    'Generated on ' + new Date().toLocaleString('en-IN') + ' by ProHorizon Scope Tracker',
    { align: 'center' }
  );

  doc.end();
  return doc;
};

module.exports = {
  getDashboardStats, getProjectHealthReport, getTaskDeliveryTrend,
  getScopeChangeReport, getTeamWorklogReport,
  exportProjectsToExcel, exportTasksToExcel, exportProjectToPDF,
};
