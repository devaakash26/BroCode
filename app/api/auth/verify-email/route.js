import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get token from the URL
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('Verification request received with token:', token?.substring(0, 5) + '...');

    if (!token) {
      console.log('Missing verification token');
      return NextResponse.json(
        { success: false, message: 'Missing verification token' },
        { status: 400 }
      );
    }

    // Check if token contains invalid characters
    if (!/^[A-Za-z0-9_-]+$/.test(token)) {
      console.log('Token contains invalid characters:', token);
      return NextResponse.json(
        { success: false, message: 'Invalid token format' },
        { status: 400 }
      );
    }

    // Find the verification token in database
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      console.log('Token not found in database:', token?.substring(0, 5) + '...');
      
      // Check if ANY tokens exist for debugging
      const allTokens = await prisma.verificationToken.findMany({
        take: 5
      });
      
      console.log(`Found ${allTokens.length} total tokens in database`);
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid verification token. Please request a new verification email.',
          debug: { tokenLength: token?.length, tokensInDb: allTokens.length }
        },
        { status: 400 }
      );
    }

    console.log('Token found, checking expiration:', verificationToken.identifier);

    // Check if token is expired
    const now = new Date();
    const tokenExpires = new Date(verificationToken.expires);
    
    if (now > tokenExpires) {
      console.log('Token expired:', tokenExpires);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Verification token has expired. Please request a new verification email.',
          debug: { 
            now: now.toISOString(),
            expires: tokenExpires.toISOString()
          }
        },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      console.log('User not found for email:', verificationToken.identifier);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found, verifying email:', user.id);

    // Get current date for verification timestamp
    const currentDate = new Date();
    
    // Ensure the date is valid and not in the future
    if (isNaN(currentDate.getTime())) {
      console.log('Invalid date generated');
      return NextResponse.json(
        { success: false, message: 'Invalid date generated' },
        { status: 500 }
      );
    }
    
    // Format to ensure the date is correct and not in the future
    const formattedDate = currentDate.toISOString();

    console.log('Updating user emailVerified date:', formattedDate);

    // Update user's email verification status with proper date format
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: formattedDate },
    });

    console.log('Deleting verification token');

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { token },
    });

    console.log('Email verification successful');

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email verified successfully',
        timestamp: formattedDate
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error verifying email',
        error: error.message
      },
      { status: 500 }
    );
  }
} 
