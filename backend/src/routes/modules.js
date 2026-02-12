const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Module, Course, Topic } = require('../models');
const { authenticate } = require('../middleware/auth');
const { requireCourseAccess } = require('../middleware/courseAccess');

const cyrMap = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',є:'ye',і:'i',ї:'yi',ґ:'g'};
function slugify(text) {
  return text
    .toString().toLowerCase()
    .split('').map(c => cyrMap[c] || c).join('')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `module-${Date.now()}`;
}

// GET /api/modules/course/:courseId — list modules for a course
router.get('/course/:courseId', authenticate, requireCourseAccess, async (req, res) => {
  try {
    const modules = await Module.findAll({
      where: { course_id: req.params.courseId },
      include: [{ model: Topic, as: 'topics', order: [['sort_order', 'ASC']] }],
      order: [['sort_order', 'ASC']],
    });
    res.json({ modules });
  } catch (err) {
    console.error('List modules error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на модули.' });
  }
});

// POST /api/modules — create module
router.post('/', authenticate, [
  body('course_id').isInt(),
  body('title').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check course access
    req.params.courseId = req.body.course_id;
    const { Course: C, CourseStaff } = require('../models');
    if (req.user.role !== 'super_admin') {
      const staff = await CourseStaff.findOne({
        where: { course_id: req.body.course_id, user_id: req.user.id },
      });
      if (!staff) {
        return res.status(403).json({ error: 'Нямате достъп до този курс.' });
      }
    }

    const { course_id, title, description, is_visible, sort_order } = req.body;
    let slug = slugify(title);

    const existing = await Module.findOne({ where: { course_id, slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const mod = await Module.create({
      course_id, title, slug, description,
      is_visible: is_visible || false,
      sort_order: sort_order || 0,
    });

    res.status(201).json({ module: mod });
  } catch (err) {
    console.error('Create module error:', err);
    res.status(500).json({ error: 'Грешка при създаване на модул.' });
  }
});

// PUT /api/modules/:id — update module
router.put('/:id', authenticate, async (req, res) => {
  try {
    const mod = await Module.findByPk(req.params.id);
    if (!mod) {
      return res.status(404).json({ error: 'Модулът не е намерен.' });
    }

    // Check course access
    if (req.user.role !== 'super_admin') {
      const { CourseStaff } = require('../models');
      const staff = await CourseStaff.findOne({
        where: { course_id: mod.course_id, user_id: req.user.id },
      });
      if (!staff) {
        return res.status(403).json({ error: 'Нямате достъп до този курс.' });
      }
    }

    const allowed = ['title', 'description', 'is_visible', 'sort_order'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) mod[field] = req.body[field];
    });

    if (req.body.title) {
      let newSlug = slugify(req.body.title);
      const existing = await Module.findOne({
        where: { course_id: mod.course_id, slug: newSlug },
      });
      if (existing && existing.id !== mod.id) newSlug = `${newSlug}-${Date.now()}`;
      mod.slug = newSlug;
    }

    await mod.save();
    res.json({ module: mod });
  } catch (err) {
    console.error('Update module error:', err);
    res.status(500).json({ error: 'Грешка при обновяване на модул.' });
  }
});

// DELETE /api/modules/:id — delete module
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const mod = await Module.findByPk(req.params.id);
    if (!mod) {
      return res.status(404).json({ error: 'Модулът не е намерен.' });
    }

    // Check course access — only teachers can delete
    if (req.user.role !== 'super_admin') {
      const { CourseStaff } = require('../models');
      const staff = await CourseStaff.findOne({
        where: { course_id: mod.course_id, user_id: req.user.id, role: 'teacher' },
      });
      if (!staff) {
        return res.status(403).json({ error: 'Само преподаватели могат да изтриват модули.' });
      }
    }

    await mod.destroy();
    res.json({ message: 'Модулът е изтрит.' });
  } catch (err) {
    console.error('Delete module error:', err);
    res.status(500).json({ error: 'Грешка при изтриване на модул.' });
  }
});

// PUT /api/modules/reorder — batch reorder
router.put('/reorder/batch', authenticate, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Невалиден формат.' });
    }
    for (const item of orders) {
      await Module.update({ sort_order: item.sort_order }, { where: { id: item.id } });
    }
    res.json({ message: 'Подредбата е обновена.' });
  } catch (err) {
    console.error('Reorder modules error:', err);
    res.status(500).json({ error: 'Грешка при подреждане на модули.' });
  }
});

module.exports = router;
