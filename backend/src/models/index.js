const User = require('./User');
const Course = require('./Course');
const CourseStaff = require('./CourseStaff');
const Module = require('./Module');
const Topic = require('./Topic');
const Lesson = require('./Lesson');
const Resource = require('./Resource');
const ProgramGroup = require('./ProgramGroup');
const CourseGroup = require('./CourseGroup');

// ── Associations ──

// Course ↔ Staff (many-to-many through CourseStaff)
Course.belongsToMany(User, {
  through: CourseStaff,
  foreignKey: 'course_id',
  otherKey: 'user_id',
  as: 'staff',
});
User.belongsToMany(Course, {
  through: CourseStaff,
  foreignKey: 'user_id',
  otherKey: 'course_id',
  as: 'courses',
});
Course.hasMany(CourseStaff, { foreignKey: 'course_id', as: 'staffEntries' });
CourseStaff.belongsTo(Course, { foreignKey: 'course_id' });
CourseStaff.belongsTo(User, { foreignKey: 'user_id' });

// Course ↔ ProgramGroup (many-to-many through CourseGroup)
Course.belongsToMany(ProgramGroup, {
  through: CourseGroup,
  foreignKey: 'course_id',
  otherKey: 'group_id',
  as: 'groups',
});
ProgramGroup.belongsToMany(Course, {
  through: CourseGroup,
  foreignKey: 'group_id',
  otherKey: 'course_id',
  as: 'courses',
});
Course.hasMany(CourseGroup, { foreignKey: 'course_id', as: 'groupEntries', onDelete: 'CASCADE' });
CourseGroup.belongsTo(Course, { foreignKey: 'course_id' });
CourseGroup.belongsTo(ProgramGroup, { foreignKey: 'group_id' });

// Course → Modules
Course.hasMany(Module, { foreignKey: 'course_id', as: 'modules', onDelete: 'CASCADE' });
Module.belongsTo(Course, { foreignKey: 'course_id' });

// Module → Topics
Module.hasMany(Topic, { foreignKey: 'module_id', as: 'topics', onDelete: 'CASCADE' });
Topic.belongsTo(Module, { foreignKey: 'module_id' });

// Topic → Lessons
Topic.hasMany(Lesson, { foreignKey: 'topic_id', as: 'lessons', onDelete: 'CASCADE' });
Lesson.belongsTo(Topic, { foreignKey: 'topic_id' });

// Lesson → Resources
Lesson.hasMany(Resource, { foreignKey: 'lesson_id', as: 'resources', onDelete: 'CASCADE' });
Resource.belongsTo(Lesson, { foreignKey: 'lesson_id' });

module.exports = {
  User,
  Course,
  CourseStaff,
  Module,
  Topic,
  Lesson,
  Resource,
  ProgramGroup,
  CourseGroup,
};
