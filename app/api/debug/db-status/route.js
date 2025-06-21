import { NextResponse } from 'next/server';
import { prisma, checkDatabaseConnection, isUsingFallbackMode } from '@/app/lib/db';
import dns from 'dns';

// Function to extract host from DATABASE_URL
function extractHost() {
  const dbUrl = process.env.DATABASE_URL || '';
  const matches = dbUrl.match(/postgresql:\/\/[^:]+:[^@]+@([^:]+):[0-9]+\/[^?]+/);
  return matches ? matches[1] : null;
}

// Function to check DNS resolution
async function checkDns(host) {
  try {
    return new Promise((resolve) => {
      dns.lookup(host, (err, address) => {
        if (err) {
          resolve({ resolved: false, error: err.message });
        } else {
          resolve({ resolved: true, address });
        }
      });
    });
  } catch (error) {
    return { resolved: false, error: error.message };
  }
}

export async function GET() {
  // Collect debug information
  const dbConnectionStatus = await checkDatabaseConnection();
  const fallbackMode = isUsingFallbackMode();
  
  // Get database host
  const host = extractHost();
  
  // Check DNS resolution if host is available
  let dnsStatus = null;
  if (host) {
    dnsStatus = await checkDns(host);
  }
  
  // Try a simple query
  let queryResult = null;
  try {
    queryResult = await prisma.$queryRaw`SELECT 1 as connection_test`;
  } catch (error) {
    queryResult = { error: error.message };
  }
  
  // Mask password for security
  const dbUrl = process.env.DATABASE_URL || 'Not defined';
  const maskedUrl = dbUrl !== 'Not defined' 
    ? dbUrl.replace(/:[^:]*@/, ':****@') 
    : dbUrl;
  
  // Compile diagnostic information
  const diagnostics = {
    timestamp: new Date().toISOString(),
    databaseUrlDefined: dbUrl !== 'Not defined',
    databaseUrlMasked: maskedUrl,
    host,
    dnsStatus,
    connectionStatus: dbConnectionStatus,
    queryResult,
    fallbackMode,
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrlDefined: !!process.env.NEXTAUTH_URL,
    troubleshooting: {
      suggestions: [
        "Check if the Supabase project still exists",
        "Verify the database is not paused",
        "Update DATABASE_URL if the project was renamed or recreated",
        "Check IP restrictions in Supabase dashboard",
        "Try restarting your application with 'npm run dev'"
      ],
      links: [
        { description: "Supabase Dashboard", url: "https://app.supabase.com/" },
        { description: "Prisma Connection Issues", url: "https://www.prisma.io/docs/concepts/components/prisma-client/handling-errors" },
        { description: "NextAuth.js Documentation", url: "https://next-auth.js.org/getting-started/introduction" }
      ]
    }
  };
  
  return NextResponse.json(diagnostics, { status: 200 });
} 
