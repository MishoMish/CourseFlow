const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Lesson = sequelize.define('Lesson', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  topic_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'topics', key: 'id' },
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  content_md: {
    type: DataTypes.TEXT,
    defaultValue: '',
    comment: 'Markdown content of the lesson',
  },
  is_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'lessons',
  indexes: [
    { unique: true, fields: ['topic_id', 'slug'] },
  ],
});

module.exports = Lesson;
