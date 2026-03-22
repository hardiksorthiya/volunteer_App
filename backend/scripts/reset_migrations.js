/**
 * Script to reset knex_migrations table
 * Run this with: node scripts/reset_migrations.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function resetMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'voluntree',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('🔄 Resetting migrations table...');
    
    // Delete all records from knex_migrations
    await connection.execute('DELETE FROM knex_migrations');
    await connection.execute('DELETE FROM knex_migrations_lock');
    
    console.log('✅ Migrations table reset successfully!');
    console.log('📝 You can now run: npm run migrate');
    
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('ℹ️  Migrations table does not exist yet. This is fine.');
      console.log('📝 You can now run: npm run migrate');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await connection.end();
  }
}

resetMigrations();

