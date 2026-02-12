require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

// ── Validate required env vars (fail fast, no fallback passwords) ──
const REQUIRED_ENV = ['POSTGRES_PASSWORD', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key] || process.env[key].startsWith('<'));
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in all <...> placeholders.');
  process.exit(1);
}

const { sequelize } = require('./db/connection');
const { runMigrations } = require('./db/migrate');
const { seedSuperAdmin, seedProgramGroups } = require('./db/seed');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const moduleRoutes = require('./routes/modules');
const topicRoutes = require('./routes/topics');
const lessonRoutes = require('./routes/lessons');
const resourceRoutes = require('./routes/resources');
const publicRoutes = require('./routes/public');
const healthRoutes = require('./routes/health');
const groupRoutes = require('./routes/groups');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // handled by nginx in production
}));

// ── Rate limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Твърде много заявки. Опитайте отново по-късно.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Твърде много опити за вход. Опитайте отново по-късно.' },
});

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// ── Static files (uploads) ──
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ──
app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/courses', apiLimiter, courseRoutes);
app.use('/api/modules', apiLimiter, moduleRoutes);
app.use('/api/topics', apiLimiter, topicRoutes);
app.use('/api/lessons', apiLimiter, lessonRoutes);
app.use('/api/resources', apiLimiter, resourceRoutes);
app.use('/api/groups', apiLimiter, groupRoutes);
app.use('/api/public', apiLimiter, publicRoutes);

// ── Error handler ──
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Вътрешна грешка на сървъра'
      : err.message,
  });
});

// ── Start ──
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await runMigrations();
    console.log('✅ Migrations complete');

    await seedSuperAdmin();
    console.log('✅ Seed complete');

    await seedProgramGroups();
    console.log('✅ Program groups seeded');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  }
}

start();
