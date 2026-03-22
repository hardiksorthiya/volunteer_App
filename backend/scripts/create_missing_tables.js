require('dotenv').config();
const db = require('../config/database');

async function createMissingTables() {
  try {
    console.log('\n🔧 Creating missing tables...\n');
    
    // Check if permissions table exists
    const [permissionsCheck] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'permissions'"
    );
    
    if (permissionsCheck.length === 0) {
      console.log('📝 Creating permissions table...');
      await db.promise.execute(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          path VARCHAR(255) NOT NULL UNIQUE,
          label VARCHAR(200) NOT NULL,
          description VARCHAR(500),
          icon_name VARCHAR(100) DEFAULT 'SettingsIcon',
          volunteer_access BOOLEAN DEFAULT TRUE,
          admin_only BOOLEAN DEFAULT FALSE,
          display_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_path (path),
          INDEX idx_volunteer_access (volunteer_access),
          INDEX idx_admin_only (admin_only)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ permissions table created\n');
    } else {
      console.log('✅ permissions table already exists\n');
    }
    
    // Check if role_permissions table exists
    const [rolePermsCheck] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role_permissions'"
    );
    
    if (rolePermsCheck.length === 0) {
      console.log('📝 Creating role_permissions table...');
      await db.promise.execute(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          permission_key VARCHAR(100) NOT NULL UNIQUE,
          permission_name VARCHAR(200) NOT NULL,
          description VARCHAR(500),
          role_0_access BOOLEAN DEFAULT TRUE COMMENT 'Admin role (0) access',
          role_1_access BOOLEAN DEFAULT FALSE COMMENT 'Volunteer role (1) access',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_permission_key (permission_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ role_permissions table created\n');
      
      // Insert default permission
      console.log('📝 Inserting default user_management permission...');
      await db.promise.execute(`
        INSERT INTO role_permissions (permission_key, permission_name, description, role_0_access, role_1_access)
        VALUES ('user_management', 'User Management', 'Access to view and manage users list', TRUE, FALSE)
        ON DUPLICATE KEY UPDATE permission_name = permission_name
      `);
      console.log('✅ Default permission inserted\n');
    } else {
      console.log('✅ role_permissions table already exists\n');
      
      // Check if default permission exists
      const [existingPerm] = await db.promise.execute(
        'SELECT * FROM role_permissions WHERE permission_key = ?',
        ['user_management']
      );
      
      if (existingPerm.length === 0) {
        console.log('📝 Inserting default user_management permission...');
        await db.promise.execute(`
          INSERT INTO role_permissions (permission_key, permission_name, description, role_0_access, role_1_access)
          VALUES ('user_management', 'User Management', 'Access to view and manage users list', TRUE, FALSE)
        `);
        console.log('✅ Default permission inserted\n');
      } else {
        console.log('✅ Default permission already exists\n');
      }
    }
    
    console.log('✅ All tables created successfully!\n');
    
    // Verify
    const [tables] = await db.promise.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('permissions', 'role_permissions')"
    );
    
    console.log('📊 Verification:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME} exists`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createMissingTables();

