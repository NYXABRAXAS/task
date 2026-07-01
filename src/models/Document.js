'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id:    { type: DataTypes.INTEGER, references: { model: 'projects', key: 'id' } },
  title:         { type: DataTypes.STRING(255), allowNull: false },
  description:   { type: DataTypes.TEXT },
  file_name:     { type: DataTypes.STRING(255), allowNull: false },
  original_name: { type: DataTypes.STRING(255), allowNull: false },
  file_path:     { type: DataTypes.STRING(500), allowNull: false },
  file_size:     { type: DataTypes.INTEGER },
  mime_type:     { type: DataTypes.STRING(150) },
  file_type:     { type: DataTypes.STRING(50) },
  category:      { type: DataTypes.STRING(100), comment: 'sow, brd, frd, wireframe, design, test_plan, other' },
  version:       { type: DataTypes.STRING(20), defaultValue: '1.0' },
  is_latest:     { type: DataTypes.BOOLEAN, defaultValue: true },
  parent_doc_id: { type: DataTypes.INTEGER, references: { model: 'documents', key: 'id' }, comment: 'For versioning' },
  access_level:  { type: DataTypes.ENUM('public', 'team', 'managers', 'private'), defaultValue: 'team' },
  tags:          { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  uploaded_by:   { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
  download_count:{ type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'documents',
  indexes: [{ fields: ['project_id', 'category'] }],
});

module.exports = Document;
