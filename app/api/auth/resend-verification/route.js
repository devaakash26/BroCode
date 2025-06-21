import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { createRandomToken } from '@/app/lib/utils';
import { sendVerificationEmail } from '@/app/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request) {
  try {
    console.log('Resend verification request received');
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.log('Authentication required for resend');
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { email } = session.user;
    console.log('Processing resend for email:', email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('User not found for email:', email);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      console.log('Email already verified for user:', email);
      return NextResponse.json(
        { success: false, message: 'Email already verified' },
        { status: 400 }
      );
    }

    console.log('Deleting existing verification tokens');
    // Delete existing verification tokens for the user
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new verification token
    const token = createRandomToken();
    console.log('Generated new token for user:', token.substring(0, 5) + '...');
    
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log('Token expires at:', expires.toISOString());

    // Create the token in database
    const savedToken = await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });
    
    console.log('Token saved in database with ID:', savedToken.token.substring(0, 5) + '...');

    // Check that we can retrieve the token we just created
    const verificationCheck = await prisma.verificationToken.findUnique({
      where: { token },
    });
    
    if (!verificationCheck) {
      console.error('Failed to save token in database');
      return NextResponse.json(
        { success: false, message: 'Failed to create verification token' },
        { status: 500 }
      );
    }

    // Build verification link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/auth/verify-email?token=${token}`;
    console.log('Verification link created:', verificationLink);

    // Send verification email
    const emailResult = await sendVerificationEmail({
      to: email,
      name: user.name || 'User',
      verificationLink,
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email', error: emailResult.error },
        { status: 500 }
      );
    }

    console.log('Verification email sent successfully to:', email);
    return NextResponse.json(
      { 
        success: true, 
        message: 'Verification email sent successfully',
        debug: {
          tokenFirstChars: token.substring(0, 5)
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
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
