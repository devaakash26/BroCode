import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { createRandomToken } from '@/app/lib/utils';
import { sendPasswordResetEmail } from '@/app/lib/email';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Even if user not found, return success for security reasons
    if (!user) {
      return NextResponse.json(
        { success: true, message: 'If an account exists with that email, a password reset link has been sent' },
        { status: 200 }
      );
    }

    // Delete existing reset tokens for the user
    await prisma.verificationToken.deleteMany({
      where: { 
        identifier: email,
        // Optional: You could filter by 'reset_password' type if you want to distinguish
        // between different token types
      },
    });

    // Create new reset token
    const token = createRandomToken();
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send password reset email
    await sendPasswordResetEmail({
      to: email,
      name: user.name || 'User',
      resetLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`,
    });

    return NextResponse.json(
      { success: true, message: 'If an account exists with that email, a password reset link has been sent' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Error processing request' },
      { status: 500 }
    );
  }
} 
