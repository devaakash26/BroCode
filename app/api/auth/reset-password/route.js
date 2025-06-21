import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(password, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json(
      { success: true, message: 'Password reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, message: 'Error resetting password' },
      { status: 500 }
    );
  }
} 
