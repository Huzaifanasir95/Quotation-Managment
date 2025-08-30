const fs = require('fs').promises;
const path = require('path');

async function setupBackend() {
  console.log('🚀 Setting up QMS Backend...\n');

  // Create uploads directory
  const uploadsDir = path.join(__dirname, 'uploads');
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory');
  } catch (error) {
    console.log('📁 Uploads directory already exists');
  }

  // Create logs directory
  const logsDir = path.join(__dirname, 'logs');
  try {
    await fs.mkdir(logsDir, { recursive: true });
    console.log('✅ Created logs directory');
  } catch (error) {
    console.log('📁 Logs directory already exists');
  }

  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  try {
    await fs.access(envPath);
    console.log('✅ Environment file exists');
  } catch (error) {
    console.log('⚠️  No .env file found. Please copy .env.example to .env and configure your settings.');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Configure your Supabase credentials in .env');
  console.log('3. Run the database schema in your Supabase dashboard');
  console.log('4. Start the server with: npm run dev');
  console.log('\n🎉 Backend setup complete!');
}

setupBackend().catch(console.error);
