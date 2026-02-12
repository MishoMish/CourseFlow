#!/bin/sh
set -e

echo "⏳ Waiting for database..."

MAX_RETRIES=30
RETRY_COUNT=0

until node -e "
  const { Sequelize } = require('sequelize');
  const s = new Sequelize(
    process.env.POSTGRES_DB,
    process.env.POSTGRES_USER,
    process.env.POSTGRES_PASSWORD,
    { host: process.env.POSTGRES_HOST, port: process.env.POSTGRES_PORT, dialect: 'postgres', logging: false }
  );
  s.authenticate().then(() => { console.log('DB ready'); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Database not available after $MAX_RETRIES attempts"
    exit 1
  fi
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES — waiting 2s..."
  sleep 2
done

echo "✅ Database is ready"
echo "🚀 Starting backend..."

exec node src/index.js
