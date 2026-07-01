'use strict';
const { Document, User, Project } = require('../models');
const { Op } = require('sequelize');
const { success, created, error, paginated } = require('../utils/response');
const path = require('path');
const fs = require('fs');

const getAll = async (req, res) => {
  try {
    const { project_id, category, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (project_id) where.project_id = project_id;
    if (category) where.category = category;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const { rows, count } = await Document.findAndCountAll({
      where,
      include: [
        { model: User, as: 'uploader', attributes: ['id','first_name','last_name'] },
        { model: Project, as: 'project', attributes: ['id','name','project_code'] },
      ],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['created_at', 'DESC']], distinct: true,
    });
    return paginated(res, rows, count, page, limit);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const getOne = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id, {
      include: [
        { model: User, as: 'uploader', attributes: ['id','first_name','last_name'] },
        { model: Project, as: 'project', attributes: ['id','name'] },
      ],
    });
    if (!doc) return error(res, 'Document not found', 404);
    return success(res, doc);
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const upload = async (req, res) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);

    const doc = await Document.create({
      project_id: req.body.project_id || null,
      title: req.body.title || req.file.originalname,
      description: req.body.description,
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      file_type: path.extname(req.file.originalname).replace('.', '').toLowerCase(),
      category: req.body.category || 'other',
      version: req.body.version || '1.0',
      access_level: req.body.access_level || 'team',
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      uploaded_by: req.user.id,
    });

    await req.auditLog({ action: 'UPLOAD', entityType: 'documents', entityId: doc.id, entityName: doc.title });
    return created(res, doc, 'Document uploaded');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const download = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return error(res, 'Document not found', 404);
    if (!fs.existsSync(doc.file_path)) return error(res, 'File not found on server', 404);

    await doc.increment('download_count');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.setHeader('Content-Type', doc.mime_type);
    return res.sendFile(path.resolve(doc.file_path));
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const update = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return error(res, 'Document not found', 404);
    await doc.update(req.body);
    return success(res, doc, 'Document updated');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

const remove = async (req, res) => {
  try {
    const doc = await Document.findByPk(req.params.id);
    if (!doc) return error(res, 'Document not found', 404);
    // Remove physical file
    if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
    await doc.destroy();
    await req.auditLog({ action: 'DELETE', entityType: 'documents', entityId: parseInt(req.params.id) });
    return success(res, null, 'Document deleted');
  } catch (err) {
    return error(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, getOne, upload, download, update, remove };
