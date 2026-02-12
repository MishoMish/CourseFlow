const router = require('express').Router();
const { ProgramGroup } = require('../models');
const { authenticate } = require('../middleware/auth');

// GET /api/groups — list all program groups (authenticated)
router.get('/', authenticate, async (_req, res) => {
  try {
    const groups = await ProgramGroup.findAll({
      order: [['sort_order', 'ASC']],
    });
    res.json({ groups });
  } catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ error: 'Грешка при зареждане на специалности.' });
  }
});

module.exports = router;
