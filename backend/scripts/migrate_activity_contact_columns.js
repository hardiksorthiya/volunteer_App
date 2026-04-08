/**
 * One-time migration: add contact_email, contact_phone, requirements to activities.
 * Safe to run multiple times (ignores duplicate column errors).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'voluntree',
  });

  const stmts = [
    'ALTER TABLE activities ADD COLUMN contact_email VARCHAR(255) NULL',
    'ALTER TABLE activities ADD COLUMN contact_phone VARCHAR(64) NULL',
    'ALTER TABLE activities ADD COLUMN requirements TEXT NULL',
  ];

  for (const sql of stmts) {
    try {
      await conn.execute(sql);
      console.log('Applied:', sql.slice(0, 60) + '...');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('Skip (exists):', sql.slice(0, 50));
      else throw e;
    }
  }

  await conn.end();
  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
