import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
} 
