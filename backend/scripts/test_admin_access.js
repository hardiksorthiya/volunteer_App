/**
 * Test script to verify admin access with role = 0
 * Run with: node scripts/test_admin_access.js
 */

const db = require('../config/database');
const jwt = require('jsonwebtoken');

async function testAdminAccess() {
  try {
    console.log('=== Testing Admin Access Flow ===\n');
    
    // Step 1: Check if role column exists
    console.log('Step 1: Checking database schema...');
    const [columns] = await db.promise.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `);
    
    if (columns.length === 0) {
      console.log('❌ ERROR: role column does not exist in users table!');
      console.log('Please add the role column first:');
      console.log('ALTER TABLE users ADD COLUMN role TINYINT DEFAULT 1;');
      return;
    }
    console.log('✅ Role column exists:', columns[0]);
    
    // Step 2: Find a user with role = 0
    console.log('\nStep 2: Finding users with role = 0...');
    const [adminUsers] = await db.promise.execute(`
      SELECT id, email, name, user_type, role, is_active 
      FROM users 
      WHERE role = 0 OR role IS NULL AND user_type = 'admin'
      LIMIT 5
    `);
    
    if (adminUsers.length === 0) {
      console.log('❌ No users found with role = 0');
      console.log('Please set a user role to 0:');
      console.log('UPDATE users SET role = 0 WHERE email = "your-email@example.com";');
      return;
    }
    
    console.log(`✅ Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach(user => {
      console.log(`   - ID: ${user.id}, Email: ${user.email}, user_type: ${user.user_type}, role: ${user.role}, role_type: ${typeof user.role}`);
    });
    
    // Step 3: Test the authenticate middleware query
    console.log('\nStep 3: Testing authenticate middleware query...');
    const testUserId = adminUsers[0].id;
    const [testUsers] = await db.promise.execute(
      'SELECT id, name, email, phone, user_type, CAST(COALESCE(role, CASE WHEN user_type="admin" THEN 0 WHEN user_type="volunteer" THEN 1 ELSE 1 END) AS UNSIGNED) AS role, is_active FROM users WHERE id = ?',
      [testUserId]
    );
    
    if (testUsers.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const testUser = testUsers[0];
    const roleAsNumber = typeof testUser.role === 'bigint' ? Number(testUser.role) : parseInt(testUser.role, 10);
    
    console.log('✅ Query result:');
    console.log(`   - ID: ${testUser.id}`);
    console.log(`   - Email: ${testUser.email}`);
    console.log(`   - user_type: ${testUser.user_type}`);
    console.log(`   - role (raw): ${testUser.role}, type: ${typeof testUser.role}`);
    console.log(`   - role (converted): ${roleAsNumber}, type: ${typeof roleAsNumber}`);
    console.log(`   - is_active: ${testUser.is_active}`);
    
    // Step 4: Test admin check logic
    console.log('\nStep 4: Testing admin check logic...');
    const isAdminByType = testUser.user_type === 'admin';
    const isAdminByRole = roleAsNumber === 0;
    const isAdmin = isAdminByType || isAdminByRole;
    
    console.log(`   - isAdminByType (user_type === 'admin'): ${isAdminByType}`);
    console.log(`   - isAdminByRole (role === 0): ${isAdminByRole}`);
    console.log(`   - Final isAdmin result: ${isAdmin}`);
    
    if (isAdmin) {
      console.log('✅ User should have admin access!');
    } else {
      console.log('❌ User does NOT have admin access!');
      console.log('   Check:');
      console.log(`   - user_type is "${testUser.user_type}" (should be "admin" OR role should be 0)`);
      console.log(`   - role is ${roleAsNumber} (should be 0 for admin)`);
    }
    
    // Step 5: Test JWT token
    console.log('\nStep 5: Testing JWT token generation...');
    const token = jwt.sign(
      { 
        id: testUser.id, 
        email: testUser.email,
        role: roleAsNumber
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
      { expiresIn: '7d' }
    );
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production');
    console.log('✅ Token generated and verified:');
    console.log(`   - Decoded ID: ${decoded.id}`);
    console.log(`   - Decoded Email: ${decoded.email}`);
    console.log(`   - Decoded Role: ${decoded.role}, type: ${typeof decoded.role}`);
    
    console.log('\n=== Test Complete ===');
    console.log('\nIf admin access is not working:');
    console.log('1. Make sure role column exists: ALTER TABLE users ADD COLUMN role TINYINT DEFAULT 1;');
    console.log('2. Set user role to 0: UPDATE users SET role = 0 WHERE email = "your-email@example.com";');
    console.log('3. Log out and log back in to get a fresh token');
    console.log('4. Check backend console logs when accessing /api/users');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    process.exit(0);
  }
}

testAdminAccess();

