const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 Testing PostgreSQL Database Connection...\n');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'portfolio_db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

console.log('Database Configuration:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  Database: ${config.database}`);
console.log(`  User: ${config.user}`);
console.log(`  Password: ${config.password ? '[SET]' : '[NOT SET]'}\n`);

const pool = new Pool(config);

async function testConnection() {
  try {
    console.log('⏳ Connecting to PostgreSQL...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Query test successful!');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].postgres_version.split(' ')[0]} ${result.rows[0].postgres_version.split(' ')[1]}`);
    
    // Test if our database exists and has tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Database '${config.database}' analysis:`);
    if (tablesResult.rows.length > 0) {
      console.log(`   Tables found: ${tablesResult.rows.length}`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
      // Check if stocks table has data
      try {
        const stocksResult = await client.query('SELECT COUNT(*) as count FROM stocks');
        console.log(`   Records in stocks table: ${stocksResult.rows[0].count}`);
      } catch (err) {
        console.log('   ⚠️  Could not query stocks table (table might not exist yet)');
      }
    } else {
      console.log('   ⚠️  No tables found - database migration needed');
    }
    
    client.release();
    console.log('\n🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
      
      // Provide specific help based on error code
      switch (error.code) {
        case 'ECONNREFUSED':
          console.error('\n💡 Possible solutions:');
          console.error('   - Make sure PostgreSQL is installed and running');
          console.error('   - Check if PostgreSQL service is started');
          console.error('   - Verify the host and port are correct');
          break;
        case '28P01':
          console.error('\n💡 Authentication failed:');
          console.error('   - Check your username and password');
          console.error('   - Verify user has access to the database');
          break;
        case '3D000':
          console.error('\n💡 Database does not exist:');
          console.error('   - Create the database first: CREATE DATABASE portfolio_db;');
          break;
        default:
          console.error('\n💡 Check your .env file configuration');
      }
    }
  } finally {
    await pool.end();
    process.exit();
  }
}

testConnection();
