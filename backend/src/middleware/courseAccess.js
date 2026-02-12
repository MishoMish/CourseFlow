const { CourseStaff } = require('../models');

/**
 * Middleware: checks if the authenticated user has access to the given course.
 * Super admins always have access.
 * Teachers and assistants must be assigned to the course.
 *
 * Expects req.params.courseId or req.body.course_id
 */
async function requireCourseAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Необходима е автентикация.' });
  }
  if (req.user.role === 'super_admin') {
    return next();
  }
  const courseId = req.params.courseId || req.body.course_id;
  if (!courseId) {
    return res.status(400).json({ error: 'Не е указан курс.' });
  }
  const staff = await CourseStaff.findOne({
    where: { course_id: courseId, user_id: req.user.id },
  });
  if (!staff) {
    return res.status(403).json({ error: 'Нямате достъп до този курс.' });
  }
  req.courseRole = staff.role; // 'teacher' or 'assistant'
  next();
}

/**
 * Middleware: requires teacher role for the course (or super_admin).
 * Assistants cannot perform this action.
 */
async function requireCourseTeacher(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Необходима е автентикация.' });
  }
  if (req.user.role === 'super_admin') {
    return next();
  }
  const courseId = req.params.courseId || req.body.course_id;
  if (!courseId) {
    return res.status(400).json({ error: 'Не е указан курс.' });
  }
  const staff = await CourseStaff.findOne({
    where: { course_id: courseId, user_id: req.user.id, role: 'teacher' },
  });
  if (!staff) {
    return res.status(403).json({ error: 'Само преподаватели могат да извършат това действие.' });
  }
  req.courseRole = 'teacher';
  next();
}

module.exports = { requireCourseAccess, requireCourseTeacher };
