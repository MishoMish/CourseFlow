const { User, ProgramGroup } = require('../models');

const PROGRAM_GROUPS = [
  { name: 'Информатика', slug: 'informatika', sort_order: 1 },
  { name: 'Информационни системи', slug: 'informacionni-sistemi', sort_order: 2 },
  { name: 'Компютърни науки', slug: 'komputarni-nauki', sort_order: 3 },
  { name: 'Софтуерно инженерство', slug: 'softuereno-inzhenerstvo', sort_order: 4 },
  { name: 'Анализ на данни', slug: 'analiz-na-danni', sort_order: 5 },
  { name: 'Математика', slug: 'matematika', sort_order: 6 },
  { name: 'Приложна математика', slug: 'prilozhna-matematika', sort_order: 7 },
  { name: 'Статистика', slug: 'statistika', sort_order: 8 },
  { name: 'Математика и информатика (редовно и задочно обучение)', slug: 'matematika-i-informatika', sort_order: 9 },
  { name: 'Избираеми дисциплини', slug: 'izbiraemi-disciplini', sort_order: 10 },
];

async function seedProgramGroups() {
  for (const group of PROGRAM_GROUPS) {
    const [_entry, created] = await ProgramGroup.findOrCreate({
      where: { slug: group.slug },
      defaults: group,
    });
    if (created) console.log(`  Program group created: ${group.name}`);
  }
}

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('  ⚠️  SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set, skipping seed.');
    return;
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    console.log('  Super admin already exists, skipping seed.');
    return;
  }

  await User.create({
    email,
    password_hash: password,
    name: process.env.SUPER_ADMIN_NAME || 'Администратор',
    role: 'super_admin',
    is_active: true,
  });
  console.log(`  Super admin created: ${email}`);
}

module.exports = { seedSuperAdmin, seedProgramGroups };

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('./connection');
  sequelize.authenticate()
    .then(() => seedSuperAdmin())
    .then(() => { console.log('✅ Seed done'); process.exit(0); })
    .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); });
}
