const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Portfolio Dashboard Backend...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from env.example');
    console.log('⚠️  Please update .env with your database credentials\n');
  } else {
    console.log('❌ env.example file not found');
  }
} else {
  console.log('✅ .env file already exists\n');
}

console.log('📋 Setup Steps:');
console.log('1. Update .env file with your PostgreSQL credentials');
console.log('2. Create PostgreSQL database: CREATE DATABASE portfolio_db;');
console.log('3. Run: npm run build');
console.log('4. Run: npm run migrate');
console.log('5. Run: npm run seed (optional - for sample data)');
console.log('6. Run: npm run dev (for development) or npm start (for production)');
console.log('\n🎉 Happy coding!');
