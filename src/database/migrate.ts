import fs from 'fs';
import path from 'path';
import Database from '../config/database';

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Test database connection
    const isConnected = await Database.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Read and execute schema file
    const schemaPath = path.join(__dirname, '..', '..', 'src', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await Database.query(schema);
    
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
