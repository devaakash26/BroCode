import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/app/lib/db';

export async function GET() {
  // Check if DATABASE_URL is defined
  const dbUrl = process.env.DATABASE_URL || 'Not defined';
  
  // Mask password for security
  const maskedUrl = dbUrl !== 'Not defined' 
    ? dbUrl.replace(/:[^:]*@/, ':****@') 
    : dbUrl;
  
  // Check database connection
  const connectionStatus = await checkDatabaseConnection();
  
  return NextResponse.json({
    databaseUrlDefined: dbUrl !== 'Not defined',
    databaseUrlMasked: maskedUrl,
    connectionStatus,
    nodeEnv: process.env.NODE_ENV,
    // Don't include NEXTAUTH_SECRET for security
    nextAuthUrlDefined: !!process.env.NEXTAUTH_URL,
  }, { status: 200 });
} 
