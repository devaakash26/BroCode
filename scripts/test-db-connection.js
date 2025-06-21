#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('Testing database connection...');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    // Try a simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('Database connection successful:', result);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    await prisma.$disconnect();
    
    // Don't exit process - this would stop the build
    // Instead, log detailed information to help debug
    console.log('Database URL format:', 
      process.env.DATABASE_URL?.replace(/\/\/.*:.*@/, '//***:***@'));
    
    return false;
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  testConnection()
    .then(success => {
      console.log(`Connection test ${success ? 'succeeded' : 'failed'}`);
    });
}

module.exports = { testConnection }; 
