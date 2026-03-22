/**
 * Script to mark migration 001 as complete if users table already exists
 * Run this with: node scripts/mark_migration_complete.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');

async function markMigrationComplete() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'voluntree',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('🔄 Checking if users table exists...');
    
    // Check if users table exists
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'",
      [process.env.DB_NAME || 'voluntree']
    );
    
    if (tables[0].count === 0) {
      console.log('ℹ️  Users table does not exist. Run: npm run migrate');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Check if migration is already recorded
    const [migrations] = await connection.execute(
      "SELECT COUNT(*) as count FROM knex_migrations WHERE name = '001_create_users_table.js'"
    );
    
    if (migrations[0].count > 0) {
      console.log('✅ Migration already recorded');
      return;
    }
    
    // Mark migration as complete
    const migrationPath = path.join(__dirname, '../migrations/001_create_users_table.js');
    const migrationName = '001_create_users_table.js';
    
    await connection.execute(
      'INSERT INTO knex_migrations (name, batch, migration_time) VALUES (?, ?, ?)',
      [migrationName, 1, new Date()]
    );
    
    console.log('✅ Migration marked as complete!');
    console.log('📝 Migration status updated successfully');
    
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('ℹ️  Migrations table does not exist. Creating it...');
      // Create knex_migrations table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS knex_migrations (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          batch INT,
          migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Now mark the migration
      await connection.execute(
        'INSERT INTO knex_migrations (name, batch, migration_time) VALUES (?, ?, ?)',
        ['001_create_users_table.js', 1, new Date()]
      );
      
      console.log('✅ Migration table created and migration marked as complete!');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await connection.end();
  }
}

markMigrationComplete();

