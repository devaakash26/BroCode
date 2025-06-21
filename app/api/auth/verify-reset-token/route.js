import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get token from the URL
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Missing reset token' },
        { status: 400 }
      );
    }

    // Find the verification token in database
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, message: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > new Date(verificationToken.expires)) {
      return NextResponse.json(
        { success: false, message: 'Reset token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Valid reset token' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Error verifying token' },
      { status: 500 }
    );
  }
} 
