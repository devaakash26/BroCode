import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Socket.IO test endpoint is working',
    uptime: process.uptime(),
    socketEnabled: true
  });
} 
