import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createRandomToken } from '@/app/lib/utils';
import { sendVerificationEmail } from '@/app/lib/email';

export async function POST(request, { params }) {
  try {
    const { userId } = params;
    
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, message: 'Email already verified' },
        { status: 400 }
      );
    }

    // Delete existing verification tokens for the user
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    // Create new verification token
    const token = createRandomToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create the token in database
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    // Build verification link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/auth/verify-email?token=${token}`;

    // Send verification email
    const emailResult = await sendVerificationEmail({
      to: user.email,
      name: user.name || 'User',
      verificationLink,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email', error: emailResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Verification email sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error sending verification email',
        error: error.message 
      },
      { status: 500 }
    );
  }
} 