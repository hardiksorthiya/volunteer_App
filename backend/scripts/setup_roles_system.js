require('dotenv').config();
const db = require('../config/database');

async function setupRolesSystem() {
  try {
    console.log('\n🔧 Setting up Roles System...\n');
    
    // Check if roles table exists
    const [rolesCheck] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles'"
    );
    
    if (rolesCheck.length === 0) {
      console.log('📝 Creating roles table...');
      await db.promise.execute(`
        CREATE TABLE IF NOT EXISTS roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description VARCHAR(500),
          is_system_role BOOLEAN DEFAULT FALSE COMMENT 'System roles (0=admin, 1=volunteer) cannot be deleted',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_name (name),
          INDEX idx_is_system_role (is_system_role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ roles table created\n');
      
      // Insert system roles
      console.log('📝 Inserting system roles...');
      await db.promise.execute(`
        INSERT INTO roles (id, name, description, is_system_role, is_active)
        VALUES 
          (0, 'Admin', 'System administrator with full access', TRUE, TRUE),
          (1, 'Volunteer', 'Standard volunteer role', TRUE, TRUE)
        ON DUPLICATE KEY UPDATE name = name
      `);
      console.log('✅ System roles inserted\n');
    } else {
      console.log('✅ roles table already exists\n');
    }
    
    // Check if role_permission_mappings table exists
    const [mappingsCheck] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permission_mappings'"
    );
    
    if (mappingsCheck.length === 0) {
      console.log('📝 Creating role_permission_mappings table...');
      await db.promise.execute(`
        CREATE TABLE IF NOT EXISTS role_permission_mappings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          role_id INT NOT NULL,
          permission_key VARCHAR(100) NOT NULL,
          has_access BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_role_permission (role_id, permission_key),
          INDEX idx_role_id (role_id),
          INDEX idx_permission_key (permission_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ role_permission_mappings table created\n');
      
      // Migrate existing permissions from role_permissions to role_permission_mappings
      console.log('📝 Migrating existing permissions...');
      await db.promise.execute(`
        INSERT INTO role_permission_mappings (role_id, permission_key, has_access)
        SELECT 0, permission_key, role_0_access
        FROM role_permissions
        WHERE role_0_access = TRUE
        ON DUPLICATE KEY UPDATE has_access = has_access
      `).catch(() => {});
      
      await db.promise.execute(`
        INSERT INTO role_permission_mappings (role_id, permission_key, has_access)
        SELECT 1, permission_key, role_1_access
        FROM role_permissions
        WHERE role_1_access = TRUE
        ON DUPLICATE KEY UPDATE has_access = has_access
      `).catch(() => {});
      console.log('✅ Permissions migrated\n');
    } else {
      console.log('✅ role_permission_mappings table already exists\n');
    }
    
    console.log('✅ Roles system setup complete!\n');
    
    // Verify
    const [roles] = await db.promise.execute('SELECT COUNT(*) as count FROM roles');
    const [mappings] = await db.promise.execute('SELECT COUNT(*) as count FROM role_permission_mappings');
    
    console.log('📊 Verification:');
    console.log(`  ✅ ${roles[0].count} role(s) in database`);
    console.log(`  ✅ ${mappings[0].count} permission mapping(s) in database\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up roles system:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupRolesSystem();

