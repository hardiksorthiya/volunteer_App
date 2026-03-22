/**
 * Test script to verify database insert works
 * Run with: node scripts/test_db_insert.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testInsert() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'voluntree',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('✅ Connected to database');
    
    // Check if users table exists
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'users'",
      [process.env.DB_NAME || 'voluntree']
    );
    
    if (tables[0].count === 0) {
      console.error('❌ Users table does not exist!');
      console.log('Run: npm run migrate');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('\n📋 Table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Test insert
    const testName = 'Test User';
    const testEmail = `test${Date.now()}@example.com`;
    const testPhone = '123-456-7890';
    const testPassword = 'password123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    console.log('\n🔄 Attempting test insert...');
    console.log('Data:', { testName, testEmail, testPhone });
    
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, phone, password, user_type) VALUES (?, ?, ?, ?, ?)',
      [testName, testEmail, testPhone, hashedPassword, 'volunteer']
    );
    
    console.log('✅ Insert successful!');
    console.log('Insert ID:', result.insertId);
    console.log('Affected rows:', result.affectedRows);
    
    // Verify the insert
    const [users] = await connection.execute(
      'SELECT id, name, email, phone, user_type, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    
    if (users.length > 0) {
      console.log('\n✅ User retrieved successfully:');
      console.log(JSON.stringify(users[0], null, 2));
    } else {
      console.error('❌ User was inserted but could not be retrieved!');
    }
    
    // Clean up test data
    await connection.execute('DELETE FROM users WHERE id = ?', [result.insertId]);
    console.log('\n🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
  } finally {
    await connection.end();
  }
}

testInsert();

