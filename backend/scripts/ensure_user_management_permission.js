require('dotenv').config();
const db = require('../config/database');

async function ensureUserManagementPermission() {
  try {
    console.log('\n🔧 Ensuring user_management permission exists...\n');
    
    // Check if role_permissions table exists
    const [tableCheck] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions'"
    );
    
    if (tableCheck.length === 0) {
      console.log('❌ role_permissions table does not exist');
      console.log('📝 Please run: cd backend && npx knex migrate:latest\n');
      process.exit(1);
    }
    
    // Check if user_management permission exists
    const [existing] = await db.promise.execute(
      'SELECT * FROM role_permissions WHERE permission_key = ?',
      ['user_management']
    );
    
    if (existing.length === 0) {
      console.log('📝 Creating user_management permission...');
      await db.promise.execute(`
        INSERT INTO role_permissions (permission_key, permission_name, description, role_0_access, role_1_access)
        VALUES ('user_management', 'User Management', 'Access to view and manage users list', TRUE, FALSE)
      `);
      console.log('✅ user_management permission created\n');
    } else {
      console.log('✅ user_management permission already exists\n');
      console.log('📊 Current settings:');
      const perm = existing[0];
      console.log(`  - Permission Name: ${perm.permission_name}`);
      console.log(`  - Description: ${perm.description || 'N/A'}`);
      console.log(`  - Admin (role 0) Access: ${perm.role_0_access ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`  - Volunteer (role 1) Access: ${perm.role_1_access ? '✅ Enabled' : '❌ Disabled'}\n`);
    }
    
    // Ensure it's in role_permission_mappings if that table exists
    const [mappingsTableCheck] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permission_mappings'"
    );
    
    if (mappingsTableCheck.length > 0) {
      // Check if mapping exists for Admin (role 0)
      const [adminMapping] = await db.promise.execute(
        'SELECT * FROM role_permission_mappings WHERE role_id = 0 AND permission_key = ?',
        ['user_management']
      );
      
      if (adminMapping.length === 0) {
        console.log('📝 Creating permission mapping for Admin role...');
        await db.promise.execute(`
          INSERT INTO role_permission_mappings (role_id, permission_key, has_access)
          VALUES (0, 'user_management', TRUE)
        `);
        console.log('✅ Admin role mapping created\n');
      } else {
        console.log('✅ Admin role mapping already exists\n');
      }
      
      // Check if mapping exists for Volunteer (role 1)
      const [volunteerMapping] = await db.promise.execute(
        'SELECT * FROM role_permission_mappings WHERE role_id = 1 AND permission_key = ?',
        ['user_management']
      );
      
      if (volunteerMapping.length === 0) {
        console.log('📝 Creating permission mapping for Volunteer role (disabled)...');
        await db.promise.execute(`
          INSERT INTO role_permission_mappings (role_id, permission_key, has_access)
          VALUES (1, 'user_management', FALSE)
        `);
        console.log('✅ Volunteer role mapping created (disabled)\n');
      } else {
        console.log('✅ Volunteer role mapping already exists\n');
      }
    }
    
    console.log('✅ user_management permission is properly configured!\n');
    
    // Show summary
    const [allPerms] = await db.promise.execute(
      'SELECT * FROM role_permissions ORDER BY id ASC'
    );
    
    console.log('📊 All Permissions:');
    allPerms.forEach((perm, index) => {
      console.log(`  ${index + 1}. ${perm.permission_name} (${perm.permission_key})`);
      console.log(`     Admin: ${perm.role_0_access ? '✅' : '❌'}, Volunteer: ${perm.role_1_access ? '✅' : '❌'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

ensureUserManagementPermission();

