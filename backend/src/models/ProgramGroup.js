const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const ProgramGroup = sequelize.define('ProgramGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
  },
  slug: {
    type: DataTypes.STRING(200),
    allowNull: false,
    unique: true,
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'program_groups',
});

module.exports = ProgramGroup;
