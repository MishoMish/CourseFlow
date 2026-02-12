const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Generates a JWT for a user
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Middleware: require valid JWT
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Необходима е автентикация.' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Невалиден или деактивиран акаунт.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Невалиден токен.' });
  }
}

// Middleware: optional authentication (sets req.user if token present)
async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (user && user.is_active) {
        req.user = user;
      }
    }
  } catch (_) {
    // ignore — optional
  }
  next();
}

// Middleware factory: require specific roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Необходима е автентикация.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Нямате достъп до този ресурс.' });
    }
    next();
  };
}

// Middleware: require super_admin
const requireSuperAdmin = requireRole('super_admin');

// Middleware: require admin (teacher) or super_admin
const requireAdmin = requireRole('super_admin', 'admin');

// Middleware: require at least assistant
const requireStaff = requireRole('super_admin', 'admin', 'assistant');

module.exports = {
  signToken,
  authenticate,
  optionalAuth,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireStaff,
};
