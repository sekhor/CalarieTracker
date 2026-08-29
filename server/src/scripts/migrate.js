require('dotenv').config();

const { connectMSSQL, getMssqlPool } = require('../config/db');

async function migrate() {
  const result = await connectMSSQL(null, { initializeSchema: true });
  if (!result.success) {
    throw new Error(result.error || 'Database migration failed');
  }

  console.log('Database schema and indexes are up to date.');
  await getMssqlPool()?.close();
}

migrate().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
