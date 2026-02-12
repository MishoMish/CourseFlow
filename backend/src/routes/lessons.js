const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Lesson, Topic, Module, Resource, CourseStaff } = require('../models');
const { authenticate } = require('../middleware/auth');

const cyrMap = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',є:'ye',і:'i',ї:'yi',ґ:'g'};
function slugify(text) {
  return text
    .toString().toLowerCase()
    .split('').map(c => cyrMap[c] || c).join('')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `lesson-${Date.now()}`;
}

async function checkLessonAccess(req, res, topicId) {
  const topic = await Topic.findByPk(topicId);
  if (!topic) {
    res.status(404).json({ error: 'Темата не е намерена.' });
    return null;
  }
  const mod = await Module.findByPk(topic.module_id);
  if (!mod) {
    res.status(404).json({ error: 'Модулът не е намерен.' });
    return null;
  }
  if (req.user.role !== 'super_admin') {
    const staff = await CourseStaff.findOne({
      where: { course_id: mod.course_id, user_id: req.user.id },
    });
    if (!staff) {
      res.status(403).json({ error: 'Нямате достъп до този курс.' });
      return null;
    }
  }
  return { topic, mod };
}

// GET /api/lessons/topic/:topicId
router.get('/topic/:topicId', authenticate, async (req, res) => {
  try {
    const access = await checkLessonAccess(req, res, req.params.topicId);
    if (!access) return;

    const lessons = await Lesson.findAll({
      where: { topic_id: req.params.topicId },
      include: [{ model: Resource, as: 'resources', order: [['sort_order', 'ASC']] }],
      order: [['sort_order', 'ASC']],
    });
    res.json({ lessons });
  } catch (err) {
    console.error('List lessons error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на уроци.' });
  }
});

// GET /api/lessons/:id — single lesson with content
router.get('/:id', authenticate, async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id, {
      include: [{ model: Resource, as: 'resources', order: [['sort_order', 'ASC']] }],
    });
    if (!lesson) {
      return res.status(404).json({ error: 'Урокът не е намерен.' });
    }

    const access = await checkLessonAccess(req, res, lesson.topic_id);
    if (!access) return;

    res.json({ lesson });
  } catch (err) {
    console.error('Get lesson error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на урок.' });
  }
});

// POST /api/lessons
router.post('/', authenticate, [
  body('topic_id').isInt(),
  body('title').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const access = await checkLessonAccess(req, res, req.body.topic_id);
    if (!access) return;

    const { topic_id, title, content_md, is_visible, sort_order } = req.body;
    let slug = slugify(title);

    const existing = await Lesson.findOne({ where: { topic_id, slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const lesson = await Lesson.create({
      topic_id, title, slug,
      content_md: content_md || '',
      is_visible: is_visible || false,
      sort_order: sort_order || 0,
    });

    res.status(201).json({ lesson });
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({ error: 'Грешка при създаване на урок.' });
  }
});

// PUT /api/lessons/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Урокът не е намерен.' });
    }

    const access = await checkLessonAccess(req, res, lesson.topic_id);
    if (!access) return;

    const allowed = ['title', 'content_md', 'is_visible', 'sort_order'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) lesson[field] = req.body[field];
    });

    if (req.body.title) {
      let newSlug = slugify(req.body.title);
      const existing = await Lesson.findOne({
        where: { topic_id: lesson.topic_id, slug: newSlug },
      });
      if (existing && existing.id !== lesson.id) newSlug = `${newSlug}-${Date.now()}`;
      lesson.slug = newSlug;
    }

    await lesson.save();
    res.json({ lesson });
  } catch (err) {
    console.error('Update lesson error:', err);
    res.status(500).json({ error: 'Грешка при обновяване на урок.' });
  }
});

// DELETE /api/lessons/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Урокът не е намерен.' });
    }

    const topic = await Topic.findByPk(lesson.topic_id);
    const mod = await Module.findByPk(topic.module_id);

    if (req.user.role !== 'super_admin') {
      const staff = await CourseStaff.findOne({
        where: { course_id: mod.course_id, user_id: req.user.id, role: 'teacher' },
      });
      if (!staff) {
        return res.status(403).json({ error: 'Само преподаватели могат да изтриват уроци.' });
      }
    }

    await lesson.destroy();
    res.json({ message: 'Урокът е изтрит.' });
  } catch (err) {
    console.error('Delete lesson error:', err);
    res.status(500).json({ error: 'Грешка при изтриване на урок.' });
  }
});

// PUT /api/lessons/reorder/batch
router.put('/reorder/batch', authenticate, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Невалиден формат.' });
    }
    for (const item of orders) {
      await Lesson.update({ sort_order: item.sort_order }, { where: { id: item.id } });
    }
    res.json({ message: 'Подредбата е обновена.' });
  } catch (err) {
    console.error('Reorder lessons error:', err);
    res.status(500).json({ error: 'Грешка при подреждане на уроци.' });
  }
});

module.exports = router;
