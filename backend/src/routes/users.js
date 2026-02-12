const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User, CourseStaff, Course } = require('../models');
const { authenticate, requireSuperAdmin, requireAdmin } = require('../middleware/auth');

// GET /api/users — list all users (admin+)
router.get('/', authenticate, requireAdmin, async (_req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['name', 'ASC']],
    });
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на потребители.' });
  }
});

// POST /api/users — create a user (super_admin only)
router.post('/', authenticate, requireSuperAdmin, [
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('name').notEmpty(),
  body('role').isIn(['admin', 'assistant']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Потребител с този имейл вече съществува.' });
    }

    const user = await User.create({
      email,
      password_hash: password, // hook will hash it
      name,
      role,
    });

    res.status(201).json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Грешка при създаване на потребител.' });
  }
});

// PUT /api/users/:id — update user (super_admin only)
router.put('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Потребителят не е намерен.' });
    }

    const { name, role, is_active } = req.body;
    if (name !== undefined) user.name = name;
    if (role !== undefined && ['admin', 'assistant'].includes(role)) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;

    await user.save();
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Грешка при обновяване на потребител.' });
  }
});

// POST /api/users/:id/reset-password — manual password reset (super_admin only)
router.post('/:id/reset-password', authenticate, requireSuperAdmin, [
  body('new_password').isLength({ min: 8 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Потребителят не е намерен.' });
    }

    user.password_hash = await bcrypt.hash(req.body.new_password, 12);
    await user.save();

    res.json({ message: 'Паролата е нулирана успешно.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Грешка при нулиране на парола.' });
  }
});

// DELETE /api/users/:id — delete user (super_admin only)
router.delete('/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Потребителят не е намерен.' });
    }
    if (user.role === 'super_admin') {
      return res.status(400).json({ error: 'Не може да се изтрие супер администратор.' });
    }

    await CourseStaff.destroy({ where: { user_id: user.id } });
    await user.destroy();

    res.json({ message: 'Потребителят е изтрит.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Грешка при изтриване на потребител.' });
  }
});

module.exports = router;
