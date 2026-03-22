/**
 * Database Connection Test Script
 * Run this to diagnose database connection issues
 * Usage: node scripts/test_db_connection.js
 */

require('dotenv').config();
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voluntree',
  port: parseInt(process.env.DB_PORT || '3306'),
  connectTimeout: 10000
};

console.log('🔍 Testing database connection...\n');
console.log('📋 Connection Configuration:');
console.log('   Host:', dbConfig.host);
console.log('   Port:', dbConfig.port);
console.log('   User:', dbConfig.user);
console.log('   Database:', dbConfig.database);
console.log('   Has Password:', !!dbConfig.password);
console.log('');

// Test 1: Try to connect without specifying database (to check if MySQL is running)
console.log('Test 1: Checking if MySQL server is running...');
const testConnection = mysql.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  port: dbConfig.port,
  connectTimeout: 10000
});

testConnection.connect((err) => {
  if (err) {
    console.error('❌ Failed to connect to MySQL server');
    console.error('   Error:', err.message);
    console.error('   Code:', err.code);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 MySQL server is not running or not accessible');
      console.error('   - For XAMPP: Start MySQL from XAMPP Control Panel');
      console.error('   - For Windows Service: Check Services (services.msc)');
      console.error('   - For Linux: sudo systemctl start mysql');
    } else if (err.code === 'ETIMEDOUT') {
      console.error('\n💡 Connection timed out');
      console.error('   - Check if MySQL is listening on port', dbConfig.port);
      console.error('   - Check firewall settings');
      console.error('   - Verify host address is correct');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied');
      console.error('   - Check username and password');
      console.error('   - Verify user has proper permissions');
    }
    
    testConnection.end();
    process.exit(1);
  }
  
  console.log('✅ MySQL server is running and accessible\n');
  
  // Test 2: Check if database exists
  console.log('Test 2: Checking if database exists...');
  testConnection.query(`SHOW DATABASES LIKE '${dbConfig.database}'`, (err, results) => {
    if (err) {
      console.error('❌ Error checking database:', err.message);
      testConnection.end();
      process.exit(1);
    }
    
    if (results.length === 0) {
      console.error(`❌ Database '${dbConfig.database}' does not exist`);
      console.error('\n💡 Create the database:');
      console.error(`   CREATE DATABASE ${dbConfig.database};`);
      testConnection.end();
      process.exit(1);
    }
    
    console.log(`✅ Database '${dbConfig.database}' exists\n`);
    
    // Test 3: Try to connect to the specific database
    console.log('Test 3: Connecting to database...');
    testConnection.end();
    
    const dbConnection = mysql.createConnection(dbConfig);
    dbConnection.connect((err) => {
      if (err) {
        console.error('❌ Failed to connect to database');
        console.error('   Error:', err.message);
        console.error('   Code:', err.code);
        
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
          console.error('\n💡 Access denied to database');
          console.error('   - Check if user has access to this database');
          console.error(`   - Grant access: GRANT ALL ON ${dbConfig.database}.* TO '${dbConfig.user}'@'localhost';`);
        }
        
        dbConnection.end();
        process.exit(1);
      }
      
      console.log('✅ Successfully connected to database!');
      console.log('\n🎉 All connection tests passed!');
      
      // Test 4: Check if tables exist
      console.log('\nTest 4: Checking for required tables...');
      dbConnection.query('SHOW TABLES', (err, results) => {
        if (err) {
          console.error('❌ Error checking tables:', err.message);
        } else {
          console.log(`✅ Found ${results.length} table(s) in database`);
          if (results.length > 0) {
            console.log('   Tables:', results.map(r => Object.values(r)[0]).join(', '));
          } else {
            console.log('   ⚠️  No tables found. Run migrations: npx knex migrate:latest');
          }
        }
        
        dbConnection.end();
        process.exit(0);
      });
    });
  });
});

