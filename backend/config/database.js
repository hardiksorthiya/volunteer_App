const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Database configuration with timeout settings
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'voluntree',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Connection timeout settings
  connectTimeout: 20000, // 20 seconds (increased from default 10s)
  acquireTimeout: 20000, // 20 seconds
  timeout: 20000, // 20 seconds
  // Enable keep-alive to detect dead connections
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('📋 Connection details:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      hasPassword: !!dbConfig.password
    });
    console.error('\n💡 Troubleshooting steps:');
    console.error('   1. Make sure MySQL/MariaDB server is running');
    console.error('   2. Check if the database "' + dbConfig.database + '" exists');
    console.error('   3. Verify database credentials in .env file');
    console.error('   4. Check if MySQL is listening on port ' + dbConfig.port);
    console.error('   5. For XAMPP: Start MySQL service from XAMPP Control Panel');
    console.error('   6. For Windows Service: Check Services (services.msc) for MySQL');
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('💡 Database connection was lost. Attempting to reconnect...');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('💡 Database connection refused. Is MySQL server running?');
  } else if (err.code === 'ETIMEDOUT') {
    console.error('💡 Database connection timed out. Check network and MySQL server status.');
  }
});

// Get promise-based pool
const promisePool = pool.promise();

module.exports = pool;
module.exports.promise = promisePool;

