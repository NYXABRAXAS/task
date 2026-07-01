'use strict';
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';
const MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,xls,xlsx,png,jpg,jpeg,txt,csv')
  .split(',')
  .map(t => t.trim().toLowerCase());

const MIME_MAP = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  txt: ['text/plain'],
  csv: ['text/csv', 'application/csv'],
};

const getAllowedMimes = () => {
  const mimes = [];
  ALLOWED_TYPES.forEach(ext => {
    if (MIME_MAP[ext]) mimes.push(...MIME_MAP[ext]);
  });
  return mimes;
};

// Ensure upload dirs exist
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir(`${UPLOAD_PATH}/documents`);
ensureDir(`${UPLOAD_PATH}/avatars`);
ensureDir(`${UPLOAD_PATH}/task-attachments`);

const createStorage = (subDir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `${UPLOAD_PATH}/${subDir}`;
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${uuidv4()}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = getAllowedMimes();
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`), false);
  }
};

// Document upload (single)
const documentUpload = multer({
  storage: createStorage('documents'),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
}).single('file');

// Avatar upload (single image)
const avatarUpload = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max for avatars
  fileFilter: (req, file, cb) => {
    if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG/JPG images allowed for avatar'), false);
    }
  },
}).single('avatar');

// Task attachment (multiple, max 5)
const taskAttachmentUpload = multer({
  storage: createStorage('task-attachments'),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
}).array('attachments', 5);

// Wrap multer in promise-based middleware with error handling
const handleUpload = (multerFn) => (req, res, next) => {
  multerFn(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ status: 'error', message: `File too large. Maximum size: ${MAX_SIZE / (1024 * 1024)} MB` });
      }
      return res.status(400).json({ status: 'error', message: err.message });
    } else if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadDocument: handleUpload(documentUpload),
  uploadAvatar: handleUpload(avatarUpload),
  uploadTaskAttachments: handleUpload(taskAttachmentUpload),
};
