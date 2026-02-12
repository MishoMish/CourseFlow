const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { signToken, authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Невалиден имейл.'),
  body('password').notEmpty().withMessage('Паролата е задължителна.'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Невалиден имейл или парола.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Акаунтът е деактивиран.' });
    }

    const valid = await user.checkPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Невалиден имейл или парола.' });
    }

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Грешка при вход.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

// POST /api/auth/change-password (own password)
router.post('/change-password', authenticate, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }).withMessage('Паролата трябва да е поне 8 символа.'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const valid = await req.user.checkPassword(req.body.current_password);
    if (!valid) {
      return res.status(400).json({ error: 'Текущата парола е грешна.' });
    }

    const bcrypt = require('bcryptjs');
    req.user.password_hash = await bcrypt.hash(req.body.new_password, 12);
    await req.user.save();

    res.json({ message: 'Паролата е променена успешно.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Грешка при смяна на парола.' });
  }
});

module.exports = router;
