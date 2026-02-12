const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const CourseGroup = sequelize.define('CourseGroup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'course_groups',
  indexes: [
    { unique: true, fields: ['course_id', 'group_id'] },
  ],
});

module.exports = CourseGroup;
