const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Resource, Lesson, Topic, Module, CourseStaff } = require('../models');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

async function checkResourceAccess(req, res, lessonId) {
  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    res.status(404).json({ error: 'Урокът не е намерен.' });
    return null;
  }
  const topic = await Topic.findByPk(lesson.topic_id);
  const mod = await Module.findByPk(topic.module_id);
  if (req.user.role !== 'super_admin') {
    const staff = await CourseStaff.findOne({
      where: { course_id: mod.course_id, user_id: req.user.id },
    });
    if (!staff) {
      res.status(403).json({ error: 'Нямате достъп до този курс.' });
      return null;
    }
  }
  return { lesson, topic, mod };
}

// GET /api/resources/lesson/:lessonId
router.get('/lesson/:lessonId', authenticate, async (req, res) => {
  try {
    const access = await checkResourceAccess(req, res, req.params.lessonId);
    if (!access) return;

    const resources = await Resource.findAll({
      where: { lesson_id: req.params.lessonId },
      order: [['sort_order', 'ASC']],
    });
    res.json({ resources });
  } catch (err) {
    console.error('List resources error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на ресурси.' });
  }
});

// POST /api/resources — create resource (with optional file upload)
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { lesson_id, type, title, url, embed_code, language, is_visible, sort_order } = req.body;

    if (!lesson_id || !type || !title) {
      return res.status(400).json({ error: 'lesson_id, type и title са задължителни.' });
    }

    const access = await checkResourceAccess(req, res, lesson_id);
    if (!access) return;

    const resource = await Resource.create({
      lesson_id,
      type,
      title,
      url: url || null,
      file_path: req.file ? `/uploads/${req.file.destination.split('/uploads/')[1]}/${req.file.filename}` : null,
      embed_code: embed_code || null,
      language: language || null,
      is_visible: is_visible !== undefined ? is_visible : true,
      sort_order: sort_order || 0,
    });

    res.status(201).json({ resource });
  } catch (err) {
    console.error('Create resource error:', err);
    res.status(500).json({ error: 'Грешка при създаване на ресурс.' });
  }
});

// PUT /api/resources/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Ресурсът не е намерен.' });
    }

    const access = await checkResourceAccess(req, res, resource.lesson_id);
    if (!access) return;

    const allowed = ['title', 'type', 'url', 'embed_code', 'language', 'is_visible', 'sort_order'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) resource[field] = req.body[field];
    });

    await resource.save();
    res.json({ resource });
  } catch (err) {
    console.error('Update resource error:', err);
    res.status(500).json({ error: 'Грешка при обновяване на ресурс.' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id);
    if (!resource) {
      return res.status(404).json({ error: 'Ресурсът не е намерен.' });
    }

    const lesson = await Lesson.findByPk(resource.lesson_id);
    const topic = await Topic.findByPk(lesson.topic_id);
    const mod = await Module.findByPk(topic.module_id);

    if (req.user.role !== 'super_admin') {
      const staff = await CourseStaff.findOne({
        where: { course_id: mod.course_id, user_id: req.user.id, role: 'teacher' },
      });
      if (!staff) {
        return res.status(403).json({ error: 'Само преподаватели могат да изтриват ресурси.' });
      }
    }

    await resource.destroy();
    res.json({ message: 'Ресурсът е изтрит.' });
  } catch (err) {
    console.error('Delete resource error:', err);
    res.status(500).json({ error: 'Грешка при изтриване на ресурс.' });
  }
});

// PUT /api/resources/reorder/batch
router.put('/reorder/batch', authenticate, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Невалиден формат.' });
    }
    for (const item of orders) {
      await Resource.update({ sort_order: item.sort_order }, { where: { id: item.id } });
    }
    res.json({ message: 'Подредбата е обновена.' });
  } catch (err) {
    console.error('Reorder resources error:', err);
    res.status(500).json({ error: 'Грешка при подреждане на ресурси.' });
  }
});

module.exports = router;
