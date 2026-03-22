require('dotenv').config();
const db = require('../config/database');

async function testRoutes() {
  try {
    console.log('\n🔍 Testing Routes Setup...\n');
    
    // Check if routes files exist
    const fs = require('fs');
    const path = require('path');
    
    const routesPath = path.join(__dirname, '..', 'routes');
    const permissionsRoute = path.join(routesPath, 'permissions.js');
    const rolesRoute = path.join(routesPath, 'roles.js');
    
    console.log('📁 Checking route files:');
    console.log(`  ${fs.existsSync(permissionsRoute) ? '✅' : '❌'} permissions.js`);
    console.log(`  ${fs.existsSync(rolesRoute) ? '✅' : '❌'} roles.js\n`);
    
    // Check if tables exist
    console.log('📊 Checking database tables:');
    
    const [tables] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('roles', 'role_permissions', 'role_permission_mappings')"
    );
    
    const tableNames = tables.map(t => t.TABLE_NAME);
    const requiredTables = ['roles', 'role_permissions', 'role_permission_mappings'];
    
    requiredTables.forEach(table => {
      const exists = tableNames.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    console.log('\n📝 Route Registration Check:');
    console.log('  Please verify in server.js that these lines exist:');
    console.log('    app.use(\'/api/permissions\', require(\'./routes/permissions\'));');
    console.log('    app.use(\'/api/roles\', require(\'./routes/roles\'));\n');
    
    console.log('💡 If routes are not working:');
    console.log('  1. Make sure backend server is restarted');
    console.log('  2. Check that all migrations have been run');
    console.log('  3. Verify the routes are registered in server.js\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testRoutes();

