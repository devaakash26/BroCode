#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const https = require('https');
const { execSync } = require('child_process');
const dns = require('dns');

// Extract host from DATABASE_URL
function extractHost() {
  const dbUrl = process.env.DATABASE_URL || '';
  const matches = dbUrl.match(/postgresql:\/\/[^:]+:[^@]+@([^:]+):[0-9]+\/[^?]+/);
  return matches ? matches[1] : null;
}

// Check DNS resolution
function checkDns(host) {
  return new Promise((resolve) => {
    console.log(`Checking DNS resolution for ${host}...`);
    dns.lookup(host, (err, address) => {
      if (err) {
        console.log(`❌ DNS resolution failed: ${err.message}`);
        resolve(false);
      } else {
        console.log(`✅ DNS resolved to ${address}`);
        resolve(true);
      }
    });
  });
}

// Check Supabase status page
function checkSupabaseStatus() {
  return new Promise((resolve) => {
    console.log('Checking Supabase status page...');
    https.get('https://status.supabase.com/api/v2/status.json', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log(`Supabase Status: ${status.status.description}`);
          if (status.status.indicator === 'none') {
            console.log('✅ Supabase services are operational');
          } else {
            console.log(`⚠️ Supabase reporting issues: ${status.status.indicator}`);
          }
          resolve(status.status.indicator === 'none');
        } catch (e) {
          console.log('❌ Error parsing Supabase status:', e.message);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log('❌ Error checking Supabase status:', err.message);
      resolve(false);
    });
  });
}

// Try netcat connection
function tryNetcatConnection(host, port) {
  try {
    console.log(`Testing TCP connection to ${host}:${port} (may take a few seconds)...`);
    
    // Use powershell on Windows to test TCP connection
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      try {
        execSync(`powershell -Command "Test-NetConnection -ComputerName ${host} -Port ${port} -InformationLevel Quiet"`, 
                { stdio: 'ignore', timeout: 5000 });
        console.log(`✅ TCP connection to ${host}:${port} successful`);
        return true;
      } catch (e) {
        console.log(`❌ TCP connection to ${host}:${port} failed`);
        return false;
      }
    } else {
      // For non-Windows systems (would use nc but we're on Windows)
      return false;
    }
  } catch (e) {
    console.log(`❌ Error testing connection: ${e.message}`);
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 SUPABASE CONNECTION DIAGNOSIS');
  console.log('===============================\n');
  
  // Extract host from DATABASE_URL
  const host = extractHost();
  if (!host) {
    console.log('❌ Could not extract host from DATABASE_URL');
    console.log('Make sure your DATABASE_URL environment variable is properly set');
    return;
  }
  
  console.log(`Database Host: ${host}`);
  
  // Check DNS resolution
  const dnsResolved = await checkDns(host);
  
  // Check Supabase general status
  await checkSupabaseStatus();
  
  // Try netcat connection if DNS resolves
  let connectionSuccess = false;
  if (dnsResolved) {
    connectionSuccess = await tryNetcatConnection(host, 5432);
    if (!connectionSuccess) {
      // Try alternate port 3000 as mentioned by user
      connectionSuccess = await tryNetcatConnection(host, 3000);
    }
  }
  
  console.log('\n🔍 DIAGNOSIS SUMMARY');
  console.log('==================\n');
  
  if (!dnsResolved) {
    console.log('❌ The database hostname cannot be resolved.');
    console.log('This usually means:');
    console.log('1. The Supabase project no longer exists');
    console.log('2. Your DATABASE_URL is outdated or incorrect');
    console.log('\nSolutions:');
    console.log('1. Log in to your Supabase dashboard (https://app.supabase.com/)');
    console.log('2. Check if your project still exists and is active');
    console.log('3. Get the correct connection string from Project Settings > Database');
    console.log('4. Update your .env or .env.local file with the new connection string');
  } else if (!connectionSuccess) {
    console.log('❌ The database server is not accepting connections.');
    console.log('This usually means:');
    console.log('1. The database is paused in Supabase');
    console.log('2. There are IP restrictions preventing your connection');
    console.log('3. Firewall issues on your network');
    console.log('\nSolutions:');
    console.log('1. Check if your database is in "Paused" state in Supabase dashboard');
    console.log('2. Check IP allow list settings in Project Settings > API');
    console.log('3. Try connecting from a different network');
  } else {
    console.log('✅ Connection to database server succeeded!');
    console.log('If your application is still having issues, check:');
    console.log('1. Database credentials in your connection string');
    console.log('2. Database permissions for your user');
    console.log('3. Application code for proper connection handling');
  }
}

main().catch(err => {
  console.error('Error during diagnosis:', err);
}); 
