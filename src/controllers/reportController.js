'use strict';
const reportService = require('../services/reportService');
const { success, error } = require('../utils/response');

const getDashboard = async (req, res) => {
  try {
    const stats = await reportService.getDashboardStats();
    return success(res, stats);
  } catch (err) {
    console.error('REPORT API ERROR [getDashboard]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

const getProjectHealth = async (req, res) => {
  try {
    const data = await reportService.getProjectHealthReport();
    return success(res, data);
  } catch (err) {
    console.error('REPORT API ERROR [getProjectHealth]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

const getTaskTrend = async (req, res) => {
  try {
    const data = await reportService.getTaskDeliveryTrend(parseInt(req.query.months) || 6);
    return success(res, data);
  } catch (err) {
    console.error('REPORT API ERROR [getTaskTrend]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

const getScopeChanges = async (req, res) => {
  try {
    const data = await reportService.getScopeChangeReport(req.query.project_id);
    return success(res, data);
  } catch (err) {
    console.error('REPORT API ERROR [getScopeChanges]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

const getTeamWorklog = async (req, res) => {
  try {
    const data = await reportService.getTeamWorklogReport(req.query);
    return success(res, data);
  } catch (err) {
    console.error('REPORT API ERROR [getTeamWorklog]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

const exportProjectsExcel = async (req, res) => {
  try {
    const wb = await reportService.exportProjectsToExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="projects-report-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('REPORT API ERROR [exportProjectsExcel]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

const exportTasksExcel = async (req, res) => {
  try {
    const wb = await reportService.exportTasksToExcel(req.query.project_id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tasks-report-${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('REPORT API ERROR [exportTasksExcel]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

const exportProjectPDF = async (req, res) => {
  try {
    const doc = await reportService.exportProjectToPDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="project-${req.params.id}-report.pdf"`);
    doc.pipe(res);
  } catch (err) {
    console.error('REPORT API ERROR [exportProjectPDF]:', err.message, '\nStack:', err.stack);
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getDashboard, getProjectHealth, getTaskTrend, getScopeChanges, getTeamWorklog, exportProjectsExcel, exportTasksExcel, exportProjectPDF };
