#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up CloudBlitz CRM...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js version 18 or higher is required');
  console.error(`   Current version: ${nodeVersion}`);
  process.exit(1);
}


// Hello wordl

console.log(`✅ Node.js version: ${nodeVersion}`);

// Install root dependencies
console.log('\n📦 Installing root dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Root dependencies installed');
} catch (error) {
  console.error('❌ Failed to install root dependencies');
  process.exit(1);
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
  process.chdir('backend');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Backend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  process.chdir('../frontend');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Go back to root directory
process.chdir('..');

// Create backend .env file if it doesn't exist
const backendEnvPath = path.join('backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  console.log('\n📝 Creating backend .env file...');
  const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/cloudblitz-crm

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-${Date.now()}
JWT_EXPIRE=3d

# CORS
FRONTEND_URL=http://localhost:3000

# Rate Limiting
# General API rate limit: 1000 requests per minute (60000ms)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
# Auth endpoint rate limit: 100 attempts per 15 minutes
AUTH_RATE_LIMIT_MAX=100
`;
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log('✅ Backend .env file created');
}

// Create logs directory
const logsDir = path.join('backend', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Logs directory created');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Make sure MongoDB is running on your system');
console.log('2. Start the application with: npm run dev');
console.log('3. Open http://localhost:3000 in your browser');
console.log('\n🔑 Demo credentials:');
console.log('   Admin: admin@cloudblitz.com / admin123');
console.log('   Sales: sales@cloudblitz.com / sales123');
console.log('   Presales: presales@cloudblitz.com / presales123');
console.log('\n📚 For more information, check the README.md file');
