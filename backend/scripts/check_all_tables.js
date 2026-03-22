require('dotenv').config();
const db = require('../config/database');

async function checkAllTables() {
  try {
    const databaseName = process.env.DB_NAME || 'voluntree';
    
    console.log(`\n📊 Checking tables in database: ${databaseName}\n`);
    
    // Get all tables
    const [tables] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [databaseName]
    );

    console.log(`✅ Found ${tables.length} table(s):\n`);
    
    const tableNames = tables.map(t => t.TABLE_NAME);
    const expectedTables = ['users', 'permissions', 'role_permissions', 'knex_migrations'];
    
    expectedTables.forEach(expectedTable => {
      const exists = tableNames.includes(expectedTable);
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${expectedTable}`);
    });
    
    console.log('\n📋 All tables in database:');
    tableNames.forEach(table => {
      console.log(`  - ${table}`);
    });
    
    // Check knex_migrations to see what migrations have run
    console.log('\n📝 Migration Status:\n');
    try {
      const [migrations] = await db.promise.execute(
        'SELECT name, batch FROM knex_migrations ORDER BY batch, id'
      );
      
      if (migrations.length === 0) {
        console.log('  ⚠️  No migrations have been run yet');
        console.log('  💡 Run: cd backend && npx knex migrate:latest\n');
      } else {
        console.log(`  ✅ ${migrations.length} migration(s) have been run:\n`);
        migrations.forEach(migration => {
          console.log(`    - ${migration.name} (batch ${migration.batch})`);
        });
      }
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') {
        console.log('  ❌ knex_migrations table does not exist');
        console.log('  💡 This means no migrations have been run yet');
        console.log('  💡 Run: cd backend && npx knex migrate:latest\n');
      } else {
        throw err;
      }
    }
    
    // Check if permissions table exists and has data
    if (tableNames.includes('permissions')) {
      const [permissions] = await db.promise.execute('SELECT COUNT(*) as count FROM permissions');
      console.log(`\n📊 Permissions table: ${permissions[0].count} record(s)`);
    }
    
    // Check if role_permissions table exists and has data
    if (tableNames.includes('role_permissions')) {
      const [rolePerms] = await db.promise.execute('SELECT COUNT(*) as count FROM role_permissions');
      console.log(`📊 Role Permissions table: ${rolePerms[0].count} record(s)`);
      
      if (rolePerms[0].count > 0) {
        const [perms] = await db.promise.execute('SELECT * FROM role_permissions');
        console.log('\n  Permissions:');
        perms.forEach(p => {
          console.log(`    - ${p.permission_name} (${p.permission_key})`);
          console.log(`      Admin: ${p.role_0_access ? '✅' : '❌'}, Volunteer: ${p.role_1_access ? '✅' : '❌'}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAllTables();

