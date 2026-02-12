const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Topic, Module, Lesson, CourseStaff } = require('../models');
const { authenticate } = require('../middleware/auth');

const cyrMap = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'',ю:'yu',я:'ya',є:'ye',і:'i',ї:'yi',ґ:'g'};
function slugify(text) {
  return text
    .toString().toLowerCase()
    .split('').map(c => cyrMap[c] || c).join('')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `topic-${Date.now()}`;
}

async function checkModuleAccess(req, res, moduleId) {
  const mod = await Module.findByPk(moduleId);
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
  return mod;
}

// GET /api/topics/module/:moduleId
router.get('/module/:moduleId', authenticate, async (req, res) => {
  try {
    const mod = await checkModuleAccess(req, res, req.params.moduleId);
    if (!mod) return;

    const topics = await Topic.findAll({
      where: { module_id: req.params.moduleId },
      include: [{ model: Lesson, as: 'lessons', attributes: ['id', 'title', 'slug', 'is_visible', 'sort_order'] }],
      order: [['sort_order', 'ASC'], [{ model: Lesson, as: 'lessons' }, 'sort_order', 'ASC']],
    });
    res.json({ topics });
  } catch (err) {
    console.error('List topics error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на теми.' });
  }
});

// POST /api/topics
router.post('/', authenticate, [
  body('module_id').isInt(),
  body('title').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const mod = await checkModuleAccess(req, res, req.body.module_id);
    if (!mod) return;

    const { module_id, title, description, is_visible, sort_order } = req.body;
    let slug = slugify(title);

    const existing = await Topic.findOne({ where: { module_id, slug } });
    if (existing) slug = `${slug}-${Date.now()}`;

    const topic = await Topic.create({
      module_id, title, slug, description,
      is_visible: is_visible || false,
      sort_order: sort_order || 0,
    });

    res.status(201).json({ topic });
  } catch (err) {
    console.error('Create topic error:', err);
    res.status(500).json({ error: 'Грешка при създаване на тема.' });
  }
});

// PUT /api/topics/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const topic = await Topic.findByPk(req.params.id);
    if (!topic) {
      return res.status(404).json({ error: 'Темата не е намерена.' });
    }

    const mod = await checkModuleAccess(req, res, topic.module_id);
    if (!mod) return;

    const allowed = ['title', 'description', 'is_visible', 'sort_order'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) topic[field] = req.body[field];
    });

    if (req.body.title) {
      let newSlug = slugify(req.body.title);
      const existing = await Topic.findOne({
        where: { module_id: topic.module_id, slug: newSlug },
      });
      if (existing && existing.id !== topic.id) newSlug = `${newSlug}-${Date.now()}`;
      topic.slug = newSlug;
    }

    await topic.save();
    res.json({ topic });
  } catch (err) {
    console.error('Update topic error:', err);
    res.status(500).json({ error: 'Грешка при обновяване на тема.' });
  }
});

// DELETE /api/topics/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const topic = await Topic.findByPk(req.params.id);
    if (!topic) {
      return res.status(404).json({ error: 'Темата не е намерена.' });
    }

    const mod = await Module.findByPk(topic.module_id);
    if (req.user.role !== 'super_admin') {
      const staff = await CourseStaff.findOne({
        where: { course_id: mod.course_id, user_id: req.user.id, role: 'teacher' },
      });
      if (!staff) {
        return res.status(403).json({ error: 'Само преподаватели могат да изтриват теми.' });
      }
    }

    await topic.destroy();
    res.json({ message: 'Темата е изтрита.' });
  } catch (err) {
    console.error('Delete topic error:', err);
    res.status(500).json({ error: 'Грешка при изтриване на тема.' });
  }
});

// PUT /api/topics/reorder/batch
router.put('/reorder/batch', authenticate, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Невалиден формат.' });
    }
    for (const item of orders) {
      await Topic.update({ sort_order: item.sort_order }, { where: { id: item.id } });
    }
    res.json({ message: 'Подредбата е обновена.' });
  } catch (err) {
    console.error('Reorder topics error:', err);
    res.status(500).json({ error: 'Грешка при подреждане на теми.' });
  }
});

module.exports = router;
