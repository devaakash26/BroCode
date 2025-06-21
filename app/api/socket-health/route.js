import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Try to connect to the socket server
    const response = await fetch('http://localhost:3000/socket.io', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (response.ok) {
      return NextResponse.json({ 
        status: 'Socket.io server is running',
        serverTime: new Date().toISOString() 
      });
    } else {
      return NextResponse.json(
        { status: 'Socket.io server is not responding properly' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Socket health check failed:', error);
    return NextResponse.json(
      { 
        status: 'Socket.io server is not available',
        error: error.message 
      },
      { status: 503 }
    );
  }
}

export const dynamic = 'force-dynamic'; 
