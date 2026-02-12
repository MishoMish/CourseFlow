const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(500),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
  },
  language: {
    type: DataTypes.STRING(5),
    defaultValue: 'bg',
  },
  academic_year: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'e.g. 2025-2026',
  },
  semester: {
    type: DataTypes.ENUM('winter', 'summer'),
    allowNull: true,
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  cover_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
}, {
  tableName: 'courses',
});

module.exports = Course;
