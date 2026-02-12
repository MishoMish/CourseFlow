const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Course, CourseStaff, User, Module, Topic, Lesson, ProgramGroup, CourseGroup } = require('../models');
const { authenticate, requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const { requireCourseAccess, requireCourseTeacher } = require('../middleware/courseAccess');

const cyrMap = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',є:'ye',і:'i',ї:'yi',ґ:'g'};
function slugify(text) {
  return text
    .toString().toLowerCase()
    .split('').map(c => cyrMap[c] || c).join('')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `item-${Date.now()}`;
}

// GET /api/courses — all courses visible to this admin
router.get('/', authenticate, async (req, res) => {
  try {
    let courses;
    if (req.user.role === 'super_admin') {
      courses = await Course.findAll({
        include: [
          {
            model: CourseStaff, as: 'staffEntries',
            include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }],
          },
          { model: ProgramGroup, as: 'groups', through: { attributes: [] } },
        ],
        order: [['sort_order', 'ASC'], ['title', 'ASC']],
      });
    } else {
      const staffEntries = await CourseStaff.findAll({
        where: { user_id: req.user.id },
        attributes: ['course_id'],
      });
      const courseIds = staffEntries.map((s) => s.course_id);
      courses = await Course.findAll({
        where: { id: courseIds },
        include: [
          {
            model: CourseStaff, as: 'staffEntries',
            include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }],
          },
          { model: ProgramGroup, as: 'groups', through: { attributes: [] } },
        ],
        order: [['sort_order', 'ASC'], ['title', 'ASC']],
      });
    }
    res.json({ courses });
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на курсове.' });
  }
});

// GET /api/courses/:courseId — single course with full tree (admin)
router.get('/:courseId', authenticate, requireCourseAccess, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.courseId, {
      include: [
        {
          model: CourseStaff, as: 'staffEntries',
          include: [{ model: User, attributes: ['id', 'name', 'email', 'role'] }],
        },
        {
          model: Module, as: 'modules',
          order: [['sort_order', 'ASC']],
        },
        { model: ProgramGroup, as: 'groups', through: { attributes: [] } },
      ],
    });
    if (!course) {
      return res.status(404).json({ error: 'Курсът не е намерен.' });
    }
    res.json({ course });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на курс.' });
  }
});

// POST /api/courses — create course (super_admin only)
router.post('/', authenticate, requireSuperAdmin, [
  body('title').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, language, academic_year, semester, is_visible, sort_order, group_ids } = req.body;
    let slug = slugify(title);

    // Ensure unique slug
    const existing = await Course.findOne({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const course = await Course.create({
      title, slug,
      description: description || '',
      language: language || 'bg',
      academic_year: academic_year || null,
      semester: semester || null,
      is_visible: is_visible || false,
      sort_order: sort_order || 0,
    });

    // Assign groups if provided
    if (Array.isArray(group_ids) && group_ids.length > 0) {
      const { CourseGroup } = require('../models');
      const entries = group_ids.map((gid) => ({ course_id: course.id, group_id: gid }));
      await CourseGroup.bulkCreate(entries);
    }

    res.status(201).json({ course });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Грешка при създаване на курс.' });
  }
});

// PUT /api/courses/:courseId — update course
router.put('/:courseId', authenticate, requireCourseTeacher, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Курсът не е намерен.' });
    }

    const allowed = ['title', 'description', 'language', 'academic_year', 'semester', 'is_visible', 'sort_order', 'cover_image'];
    const nullIfEmpty = ['semester', 'academic_year'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        course[field] = nullIfEmpty.includes(field) && req.body[field] === '' ? null : req.body[field];
      }
    });

    // Update group assignments
    if (Array.isArray(req.body.group_ids)) {
      const { CourseGroup } = require('../models');
      await CourseGroup.destroy({ where: { course_id: course.id } });
      if (req.body.group_ids.length > 0) {
        const entries = req.body.group_ids.map((gid) => ({ course_id: course.id, group_id: gid }));
        await CourseGroup.bulkCreate(entries);
      }
    }

    if (req.body.title && req.body.title !== course.title) {
      let newSlug = slugify(req.body.title);
      const existing = await Course.findOne({ where: { slug: newSlug } });
      if (existing && existing.id !== course.id) newSlug = `${newSlug}-${Date.now()}`;
      course.slug = newSlug;
    }

    await course.save();
    res.json({ course });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ error: 'Грешка при обновяване на курс.' });
  }
});

// DELETE /api/courses/:courseId — delete course (super_admin only)
router.delete('/:courseId', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) {
      return res.status(404).json({ error: 'Курсът не е намерен.' });
    }
    await course.destroy();
    res.json({ message: 'Курсът е изтрит.' });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Грешка при изтриване на курс.' });
  }
});

// ── Staff management ──

// POST /api/courses/:courseId/staff — add staff member
router.post('/:courseId/staff', authenticate, requireCourseTeacher, [
  body('user_id').isInt(),
  body('role').isIn(['teacher', 'assistant']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user_id, role } = req.body;
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: 'Потребителят не е намерен.' });
    }

    const [entry, created] = await CourseStaff.findOrCreate({
      where: { course_id: req.params.courseId, user_id },
      defaults: { role },
    });

    if (!created) {
      entry.role = role;
      await entry.save();
    }

    res.status(created ? 201 : 200).json({ staff: entry });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ error: 'Грешка при добавяне на член на екипа.' });
  }
});

// DELETE /api/courses/:courseId/staff/:userId — remove staff member
router.delete('/:courseId/staff/:userId', authenticate, requireCourseTeacher, async (req, res) => {
  try {
    const deleted = await CourseStaff.destroy({
      where: { course_id: req.params.courseId, user_id: req.params.userId },
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Записът не е намерен.' });
    }
    res.json({ message: 'Членът на екипа е премахнат.' });
  } catch (err) {
    console.error('Remove staff error:', err);
    res.status(500).json({ error: 'Грешка при премахване на член на екипа.' });
  }
});

// PUT /api/courses/:courseId/reorder — reorder courses (super_admin)
router.put('/:courseId/reorder', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { orders } = req.body; // [{ id: 1, sort_order: 0 }, ...]
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Невалиден формат.' });
    }
    for (const item of orders) {
      await Course.update({ sort_order: item.sort_order }, { where: { id: item.id } });
    }
    res.json({ message: 'Подредбата е обновена.' });
  } catch (err) {
    console.error('Reorder courses error:', err);
    res.status(500).json({ error: 'Грешка при подреждане на курсове.' });
  }
});

// POST /api/courses/:courseId/import — bulk import folder structure
router.post('/:courseId/import', authenticate, requireCourseTeacher, async (req, res) => {
  const t = await Course.sequelize.transaction();
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) {
      await t.rollback();
      return res.status(404).json({ error: 'Курсът не е намерен.' });
    }

    const { modules: modulesData } = req.body;
    if (!Array.isArray(modulesData) || modulesData.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Няма данни за импортиране.' });
    }

    const existingModules = await Module.findAll({ where: { course_id: course.id } });
    const moduleOffset = existingModules.length;
    const counts = { modules: 0, topics: 0, lessons: 0 };

    // Track slugs used within this transaction to avoid collisions
    const usedModSlugs = new Set(existingModules.map(m => m.slug));

    function uniqueSlug(base, usedSet) {
      let slug = base;
      let i = 2;
      while (usedSet.has(slug)) { slug = `${base}-${i++}`; }
      usedSet.add(slug);
      return slug;
    }

    for (const modData of modulesData) {
      const modSlug = uniqueSlug(slugify(modData.title), usedModSlugs);

      const mod = await Module.create({
        course_id: course.id,
        title: modData.title,
        slug: modSlug,
        is_visible: true,
        sort_order: moduleOffset + (modData.sort_order || 0),
      }, { transaction: t });
      counts.modules++;

      const usedTopicSlugs = new Set();
      for (const topicData of (modData.topics || [])) {
        const topicSlug = uniqueSlug(slugify(topicData.title), usedTopicSlugs);

        const topic = await Topic.create({
          module_id: mod.id,
          title: topicData.title,
          slug: topicSlug,
          is_visible: true,
          sort_order: topicData.sort_order || 0,
        }, { transaction: t });
        counts.topics++;

        const usedLessonSlugs = new Set();
        for (const lessonData of (topicData.lessons || [])) {
          const lessonSlug = uniqueSlug(slugify(lessonData.title), usedLessonSlugs);

          await Lesson.create({
            topic_id: topic.id,
            title: lessonData.title,
            slug: lessonSlug,
            content_md: lessonData.content_md || '',
            is_visible: true,
            sort_order: lessonData.sort_order || 0,
          }, { transaction: t });
          counts.lessons++;
        }
      }
    }

    await t.commit();
    res.json({ message: 'Импортирането е успешно.', counts });
  } catch (err) {
    await t.rollback();
    console.error('Import error:', err);
    res.status(500).json({ error: 'Грешка при импортиране.' });
  }
});

module.exports = router;
