const { sequelize } = require('./connection');
require('../models'); // registers all associations

async function runMigrations() {
  // sync all models — in production, use proper migrations
  // force: false ensures we never drop tables
  await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
}

module.exports = { runMigrations };

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  runMigrations()
    .then(() => { console.log('✅ Migrations done'); process.exit(0); })
    .catch((e) => { console.error('❌ Migration failed:', e); process.exit(1); });
}
