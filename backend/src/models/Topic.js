const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const Topic = sequelize.define('Topic', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'modules', key: 'id' },
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: '',
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
  tableName: 'topics',
  indexes: [
    { unique: true, fields: ['module_id', 'slug'] },
  ],
});

module.exports = Topic;
