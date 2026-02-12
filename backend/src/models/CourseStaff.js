const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/connection');

const CourseStaff = sequelize.define('CourseStaff', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  course_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'courses', key: 'id' },
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  role: {
    type: DataTypes.ENUM('teacher', 'assistant'),
    allowNull: false,
    defaultValue: 'assistant',
  },
}, {
  tableName: 'course_staff',
  indexes: [
    { unique: true, fields: ['course_id', 'user_id'] },
  ],
});

module.exports = CourseStaff;
