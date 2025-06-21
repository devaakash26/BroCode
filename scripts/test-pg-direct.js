#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

// First check if pg is installed
try {
  require('pg');
} catch (e) {
  console.error('The "pg" package is not installed. Install it with:');
  console.error('npm install pg --save-dev');
  process.exit(1);
}

const { Client } = require('pg');

// Parse the database URL or use individual connection params
function getConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  
  // Try individual connection parameters
  const config = {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  };
  
  // Check if any of these are undefined
  const missingParams = Object.entries(config)
    .filter(([_, value]) => value === undefined)
    .map(([key]) => key);
  
  if (missingParams.length > 0) {
    console.error(`Missing connection parameters: ${missingParams.join(', ')}`);
    console.error('Either set DATABASE_URL or all individual connection parameters');
    process.exit(1);
  }
  
  return config;
}

async function testConnection() {
  console.log('Testing direct PostgreSQL connection...');
  
  const config = getConnectionConfig();
  
  // Log masked config for debugging
  const maskedConfig = { ...config };
  if (maskedConfig.connectionString) {
    maskedConfig.connectionString = maskedConfig.connectionString.replace(/:[^:]*@/, ':****@');
  } else if (maskedConfig.password) {
    maskedConfig.password = '****';
  }
  
  console.log('Connection config:', maskedConfig);
  
  const client = new Client(config);
  
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    
    console.log('Connected successfully!');
    
    // Test a simple query
    console.log('Testing query...');
    const res = await client.query('SELECT current_timestamp as time');
    console.log('Query successful:', res.rows[0]);
    
    await client.end();
    console.log('Disconnected successfully');
    
    return true;
  } catch (err) {
    console.error('Connection failed:', err.message);
    
    if (err.code === 'ENOTFOUND') {
      console.log('\nHostname could not be resolved. Check your database host name.');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('\nConnection refused. The database server might be:');
      console.log('- Not running');
      console.log('- Not accessible from your current network');
      console.log('- Blocked by a firewall');
      console.log('- Not configured to accept connections from your IP');
    } else if (err.code === 'ETIMEDOUT') {
      console.log('\nConnection timed out. This usually means:');
      console.log('- Network connectivity issues');
      console.log('- Firewall blocking the connection');
      console.log('- Database server is unreachable');
    } else if (err.code === '28P01') {
      console.log('\nAuthentication failed. Check your username and password.');
    } else if (err.code === '3D000') {
      console.log('\nDatabase does not exist. Check your database name.');
    }
    
    try {
      await client.end();
    } catch (e) {
      // Ignore error on cleanup
    }
    
    return false;
  }
}

// Execute the test
testConnection()
  .then(success => {
    if (success) {
      console.log('\n✓ PostgreSQL connection working correctly!');
      process.exit(0);
    } else {
      console.log('\n✗ PostgreSQL connection failed. See errors above.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  }); 
