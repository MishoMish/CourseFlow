const router = require('express').Router();
const { Op } = require('sequelize');
const { Course, Module, Topic, Lesson, Resource, CourseStaff, User, ProgramGroup, CourseGroup } = require('../models');

// GET /api/public/courses — all visible courses
router.get('/courses', async (_req, res) => {
  try {
    const courses = await Course.findAll({
      where: { is_visible: true },
      attributes: ['id', 'title', 'slug', 'description', 'language', 'academic_year', 'semester', 'cover_image', 'sort_order'],
      include: [
        {
          model: CourseStaff,
          as: 'staffEntries',
          where: { role: 'teacher' },
          required: false,
          include: [{ model: User, attributes: ['id', 'name'] }],
        },
        { model: ProgramGroup, as: 'groups', through: { attributes: [] } },
      ],
      order: [['sort_order', 'ASC'], ['title', 'ASC']],
    });
    res.json({ courses });
  } catch (err) {
    console.error('Public courses error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на курсове.' });
  }
});

// GET /api/public/courses/:slug — single course with visible modules
router.get('/courses/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { slug: req.params.slug, is_visible: true },
      attributes: ['id', 'title', 'slug', 'description', 'language', 'academic_year', 'semester', 'cover_image'],
      include: [
        {
          model: CourseStaff,
          as: 'staffEntries',
          where: { role: 'teacher' },
          required: false,
          include: [{ model: User, attributes: ['id', 'name'] }],
        },
        {
          model: Module,
          as: 'modules',
          where: { is_visible: true },
          required: false,
          attributes: ['id', 'title', 'slug', 'description', 'sort_order'],
        },
        { model: ProgramGroup, as: 'groups', through: { attributes: [] } },
      ],
      order: [[{ model: Module, as: 'modules' }, 'sort_order', 'ASC']],
    });

    if (!course) {
      return res.status(404).json({ error: 'Курсът не е намерен.' });
    }
    res.json({ course });
  } catch (err) {
    console.error('Public course error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на курс.' });
  }
});

// GET /api/public/courses/:slug/modules/:moduleSlug — module with visible topics
router.get('/courses/:slug/modules/:moduleSlug', async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { slug: req.params.slug, is_visible: true },
    });
    if (!course) {
      return res.status(404).json({ error: 'Курсът не е намерен.' });
    }

    const mod = await Module.findOne({
      where: { course_id: course.id, slug: req.params.moduleSlug, is_visible: true },
      attributes: ['id', 'title', 'slug', 'description', 'sort_order'],
      include: [{
        model: Topic,
        as: 'topics',
        where: { is_visible: true },
        required: false,
        attributes: ['id', 'title', 'slug', 'description', 'sort_order'],
      }],
      order: [[{ model: Topic, as: 'topics' }, 'sort_order', 'ASC']],
    });

    if (!mod) {
      return res.status(404).json({ error: 'Модулът не е намерен.' });
    }
    res.json({ module: mod, course: { id: course.id, title: course.title, slug: course.slug } });
  } catch (err) {
    console.error('Public module error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на модул.' });
  }
});

// GET /api/public/courses/:slug/modules/:moduleSlug/topics/:topicSlug — topic with visible lessons
router.get('/courses/:slug/modules/:moduleSlug/topics/:topicSlug', async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { slug: req.params.slug, is_visible: true },
    });
    if (!course) return res.status(404).json({ error: 'Курсът не е намерен.' });

    const mod = await Module.findOne({
      where: { course_id: course.id, slug: req.params.moduleSlug, is_visible: true },
    });
    if (!mod) return res.status(404).json({ error: 'Модулът не е намерен.' });

    const topic = await Topic.findOne({
      where: { module_id: mod.id, slug: req.params.topicSlug, is_visible: true },
      attributes: ['id', 'title', 'slug', 'description', 'sort_order'],
      include: [{
        model: Lesson,
        as: 'lessons',
        where: { is_visible: true },
        required: false,
        attributes: ['id', 'title', 'slug', 'sort_order'],
      }],
      order: [[{ model: Lesson, as: 'lessons' }, 'sort_order', 'ASC']],
    });

    if (!topic) return res.status(404).json({ error: 'Темата не е намерена.' });

    res.json({
      topic,
      module: { id: mod.id, title: mod.title, slug: mod.slug },
      course: { id: course.id, title: course.title, slug: course.slug },
    });
  } catch (err) {
    console.error('Public topic error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на тема.' });
  }
});

// GET /api/public/courses/:slug/modules/:moduleSlug/topics/:topicSlug/lessons/:lessonSlug — full lesson
router.get('/courses/:slug/modules/:moduleSlug/topics/:topicSlug/lessons/:lessonSlug', async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { slug: req.params.slug, is_visible: true },
    });
    if (!course) return res.status(404).json({ error: 'Курсът не е намерен.' });

    const mod = await Module.findOne({
      where: { course_id: course.id, slug: req.params.moduleSlug, is_visible: true },
    });
    if (!mod) return res.status(404).json({ error: 'Модулът не е намерен.' });

    const topic = await Topic.findOne({
      where: { module_id: mod.id, slug: req.params.topicSlug, is_visible: true },
    });
    if (!topic) return res.status(404).json({ error: 'Темата не е намерена.' });

    const lesson = await Lesson.findOne({
      where: { topic_id: topic.id, slug: req.params.lessonSlug, is_visible: true },
      include: [{
        model: Resource,
        as: 'resources',
        where: { is_visible: true },
        required: false,
        order: [['sort_order', 'ASC']],
      }],
    });

    if (!lesson) return res.status(404).json({ error: 'Урокът не е намерен.' });

    // Get sibling lessons for navigation
    const siblings = await Lesson.findAll({
      where: { topic_id: topic.id, is_visible: true },
      attributes: ['id', 'title', 'slug', 'sort_order'],
      order: [['sort_order', 'ASC']],
    });

    res.json({
      lesson,
      siblings,
      topic: { id: topic.id, title: topic.title, slug: topic.slug },
      module: { id: mod.id, title: mod.title, slug: mod.slug },
      course: { id: course.id, title: course.title, slug: course.slug },
    });
  } catch (err) {
    console.error('Public lesson error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на урок.' });
  }
});

// GET /api/public/groups — all program groups
router.get('/groups', async (_req, res) => {
  try {
    const groups = await ProgramGroup.findAll({
      order: [['sort_order', 'ASC']],
    });
    res.json({ groups });
  } catch (err) {
    console.error('Public groups error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на специалности.' });
  }
});

// GET /api/public/years — distinct academic years
router.get('/years', async (_req, res) => {
  try {
    const rows = await Course.findAll({
      where: { is_visible: true, academic_year: { [Op.ne]: null } },
      attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('academic_year')), 'academic_year']],
      order: [['academic_year', 'DESC']],
      raw: true,
    });
    const years = rows.map((r) => r.academic_year).filter(Boolean);
    res.json({ years });
  } catch (err) {
    console.error('Public years error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на години.' });
  }
});

// GET /api/public/search?q=...&group=slug — search courses
router.get('/search', async (req, res) => {
  try {
    const { q, group, year } = req.query;
    const where = { is_visible: true };

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
      ];
    }

    if (year) {
      where.academic_year = year;
    }

    const include = [
      {
        model: CourseStaff,
        as: 'staffEntries',
        where: { role: 'teacher' },
        required: false,
        include: [{ model: User, attributes: ['id', 'name'] }],
      },
      {
        model: ProgramGroup,
        as: 'groups',
        through: { attributes: [] },
      },
    ];

    // Filter by group slug
    if (group) {
      include[1] = {
        model: ProgramGroup,
        as: 'groups',
        through: { attributes: [] },
        where: { slug: group },
        required: true,
      };
    }

    const courses = await Course.findAll({
      where,
      attributes: ['id', 'title', 'slug', 'description', 'language', 'academic_year', 'semester', 'cover_image', 'sort_order'],
      include,
      order: [['sort_order', 'ASC'], ['title', 'ASC']],
    });

    // If filtered by group, we need to reload all groups for each course
    if (group && courses.length > 0) {
      const courseIds = courses.map(c => c.id);
      const allCourses = await Course.findAll({
        where: { id: courseIds },
        include: [{ model: ProgramGroup, as: 'groups', through: { attributes: [] } }],
      });
      const groupMap = {};
      allCourses.forEach(c => { groupMap[c.id] = c.groups; });
      courses.forEach(c => { c.setDataValue('groups', groupMap[c.id] || []); });
    }

    res.json({ courses });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Грешка при търсене.' });
  }
});

module.exports = router;
