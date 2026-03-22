const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function createDatabase() {
  let connection;
  
  try {
    // Connect to MySQL without specifying a database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
    });

    const dbName = process.env.DB_NAME || 'Voluntree_connect';
    
    console.log(`Creating database: ${dbName}...`);
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    console.log(`✅ Database '${dbName}' created successfully or already exists!`);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    if (connection) {
      await connection.end();
    }
    return false;
  }
}

createDatabase()
  .then((success) => {
    if (success) {
      console.log('\n✅ Database setup complete! You can now run migrations.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

