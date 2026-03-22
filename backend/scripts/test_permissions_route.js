require('dotenv').config();

// Test if the permissions route can be loaded
try {
  console.log('\n🔍 Testing Permissions Route...\n');
  
  const permissionsRoute = require('../routes/permissions');
  console.log('✅ Permissions route loaded successfully');
  console.log('   Route type:', typeof permissionsRoute);
  console.log('   Has get method:', typeof permissionsRoute.get === 'function');
  
  // Try to load roles route too
  const rolesRoute = require('../routes/roles');
  console.log('✅ Roles route loaded successfully');
  console.log('   Route type:', typeof rolesRoute);
  console.log('   Has get method:', typeof rolesRoute.get === 'function');
  
  console.log('\n✅ All routes can be loaded!\n');
  console.log('💡 If you still get 404 errors:');
  console.log('   1. Make sure backend server is running');
  console.log('   2. Restart the backend server');
  console.log('   3. Check server console for errors\n');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error(error.stack);
  process.exit(1);
}

