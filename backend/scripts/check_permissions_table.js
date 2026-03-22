require('dotenv').config();
const db = require('../config/database');

async function checkPermissionsTable() {
  try {
    // Check if table exists
    const [tables] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'role_permissions'",
      [process.env.DB_NAME || 'voluntree']
    );

    if (tables.length === 0) {
      console.log('❌ role_permissions table does NOT exist');
      console.log('📝 Please run: cd backend && npx knex migrate:latest');
      process.exit(1);
    }

    console.log('✅ role_permissions table exists');

    // Check if there are any permissions
    const [permissions] = await db.promise.execute(
      'SELECT * FROM role_permissions'
    );

    console.log(`📊 Found ${permissions.length} permission(s):`);
    permissions.forEach(perm => {
      console.log(`  - ${perm.permission_name} (${perm.permission_key})`);
      console.log(`    Admin (role 0): ${perm.role_0_access ? '✅' : '❌'}`);
      console.log(`    Volunteer (role 1): ${perm.role_1_access ? '✅' : '❌'}`);
    });

    if (permissions.length === 0) {
      console.log('⚠️  No permissions found in table. The migration may not have inserted default data.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking permissions table:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('📝 Please run: cd backend && npx knex migrate:latest');
    }
    process.exit(1);
  }
}

checkPermissionsTable();

