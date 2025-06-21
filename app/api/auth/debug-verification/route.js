import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { createRandomToken } from '@/app/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// This is a debug-only endpoint that should be disabled in production
export async function GET(request) {
  try {
    // Get the email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email parameter is required' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Delete existing verification tokens for the user
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new verification token
    const token = createRandomToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });
    
    // Retrieve the token to confirm it was saved
    const savedToken = await prisma.verificationToken.findUnique({
      where: { token },
    });
    
    if (!savedToken) {
      return NextResponse.json(
        { success: false, message: 'Failed to save token' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/auth/verify-email?token=${token}`;
    
    return NextResponse.json({
      success: true, 
      message: 'Debug verification token created',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified
      },
      token: {
        id: savedToken.token,
        expires: savedToken.expires
      },
      verificationLink,
    });
  } catch (error) {
    console.error('Debug verification token error:', error);
    return NextResponse.json(
      { success: false, message: 'Error creating debug token', error: error.message },
      { status: 500 }
    );
  }
} 
