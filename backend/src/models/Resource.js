const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Resource = sequelize.define('Resource', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  lesson_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'lessons', key: 'id' },
  },
  type: {
    type: DataTypes.ENUM('pdf', 'video', 'github', 'code', 'link', 'file'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'External URL or path to uploaded file',
  },
  file_path: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: 'Path to uploaded file on disk',
  },
  embed_code: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Raw embed HTML for interactive/sandbox content',
  },
  language: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Programming language for code resources',
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'resources',
});

module.exports = Resource;
