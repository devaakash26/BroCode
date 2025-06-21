#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Helper to log with colors
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main function to diagnose and fix database connection issues
async function diagnoseAndFix() {
  log('🔍 DIAGNOSING DATABASE CONNECTION ISSUES', 'cyan');
  log('========================================', 'cyan');
  console.log('');
  
  // Step 1: Check if DATABASE_URL is defined
  log('STEP 1: Checking environment variables', 'blue');
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    log('❌ DATABASE_URL is not defined in your environment!', 'red');
    await createEnvFile();
  } else {
    log('✅ DATABASE_URL is defined', 'green');
    
    // Mask the connection string for logging
    const maskedUrl = dbUrl.replace(/:[^:]*@/, ':****@');
    log(`   Connection string: ${maskedUrl}`, 'yellow');
    
    // Step 2: Check if the connection string has the correct format
    const urlPattern = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:[0-9]+\/[^?]+(\\?.*)?$/;
    
    if (!urlPattern.test(dbUrl)) {
      log('❌ DATABASE_URL format appears to be invalid', 'red');
      log('   Expected format: postgresql://user:password@host:port/database', 'yellow');
      await createEnvFile();
    } else {
      log('✅ DATABASE_URL format looks valid', 'green');
    }
  }
  
  // Step 3: Check if Prisma client is generated
  log('\nSTEP 2: Checking Prisma setup', 'blue');
  
  const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
  
  if (!fs.existsSync(prismaClientPath)) {
    log('❌ Prisma client is not generated', 'red');
    log('   Attempting to generate Prisma client...', 'yellow');
    
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      log('✅ Prisma client generated successfully', 'green');
    } catch (error) {
      log('❌ Failed to generate Prisma client', 'red');
      log('   Error: ' + error.message, 'red');
    }
  } else {
    log('✅ Prisma client is already generated', 'green');
  }
  
  // Step 4: Check network connectivity to the database
  log('\nSTEP 3: Testing network connectivity', 'blue');
  
  try {
    // Extract host and port from DATABASE_URL
    const matches = dbUrl?.match(/postgresql:\/\/[^:]+:[^@]+@([^:]+):([0-9]+)\/[^?]+/);
    
    if (!matches) {
      log('❌ Could not extract host and port from DATABASE_URL', 'red');
    } else {
      const host = matches[1];
      const port = matches[2];
      
      log(`   Testing connection to ${host}:${port}...`, 'yellow');
      
      // Use net module to test TCP connection
      const net = require('net');
      const socket = new net.Socket();
      
      const connectPromise = new Promise((resolve, reject) => {
        // Set a timeout of 5 seconds
        socket.setTimeout(5000);
        
        socket.on('connect', () => {
          log('✅ TCP connection successful', 'green');
          socket.end();
          resolve(true);
        });
        
        socket.on('timeout', () => {
          log('❌ Connection timed out', 'red');
          socket.destroy();
          reject(new Error('Connection timed out'));
        });
        
        socket.on('error', (err) => {
          log(`❌ Connection error: ${err.message}`, 'red');
          reject(err);
        });
        
        // Attempt to connect
        socket.connect(port, host);
      });
      
      try {
        await connectPromise;
      } catch (err) {
        // Connection failed - suggest solutions
        log('\nPossible network issues:', 'yellow');
        log('1. The database server might be down or unreachable', 'yellow');
        log('2. A firewall might be blocking the connection', 'yellow');
        log('3. Your IP address might not be whitelisted on the database server', 'yellow');
        log('4. If using Supabase or a cloud database, check if:', 'yellow');
        log('   - The database is paused/hibernated', 'yellow');
        log('   - You have IP allow list enabled that doesn\'t include your current IP', 'yellow');
      }
    }
  } catch (error) {
    log('   Could not test network connectivity: ' + error.message, 'red');
  }
  
  // Final summary
  console.log('');
  log('DATABASE CONNECTION DIAGNOSIS COMPLETE', 'magenta');
  log('===================================', 'magenta');
  log('\nRecommended next steps:', 'yellow');
  log('1. Run: npm run db:test-pg - to test direct PostgreSQL connection', 'yellow');
  log('2. Run: npm run db:test - to test Prisma connection', 'yellow');
  log('3. Run: npm run dev - to restart your Next.js application', 'yellow');
  log('\nIf issues persist, check:', 'yellow');
  log('- Supabase dashboard for database status', 'yellow');
  log('- IP allow list settings', 'yellow');
  log('- Database user permissions', 'yellow');
  console.log('');
}

// Helper to create or update .env.local file
async function createEnvFile() {
  log('\nWould you like to create or update your .env.local file? (y/n)', 'yellow');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    readline.question('> ', resolve);
  });
  
  if (answer.toLowerCase() === 'y') {
    log('\nEnter your database connection details:', 'blue');
    
    const details = {};
    
    details.host = await promptQuestion(readline, 'Database Host (e.g., db.example.supabase.co): ');
    details.port = await promptQuestion(readline, 'Database Port (usually 5432): ', '5432');
    details.user = await promptQuestion(readline, 'Database User: ');
    details.password = await promptQuestion(readline, 'Database Password: ');
    details.database = await promptQuestion(readline, 'Database Name: ', 'postgres');
    
    // Create the connection string
    const connectionString = `postgresql://${details.user}:${details.password}@${details.host}:${details.port}/${details.database}`;
    
    // Read existing .env.local or create new one
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Update DATABASE_URL if it exists, otherwise add it
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*(\r?\n|$)/g, `DATABASE_URL="${connectionString}"$1`);
      } else {
        envContent += `\nDATABASE_URL="${connectionString}"\n`;
      }
    } else {
      envContent = `DATABASE_URL="${connectionString}"\n`;
    }
    
    // Write the updated or new .env.local file
    fs.writeFileSync(envPath, envContent);
    
    log('\n✅ .env.local file updated successfully', 'green');
  }
  
  readline.close();
}

// Helper to prompt for input
async function promptQuestion(readline, question, defaultValue = '') {
  return new Promise(resolve => {
    readline.question(`${question}${defaultValue ? ` (${defaultValue})` : ''} `, answer => {
      resolve(answer || defaultValue);
    });
  });
}

// Run the diagnosis
diagnoseAndFix().catch(error => {
  console.error('Error during diagnosis:', error);
}); 
