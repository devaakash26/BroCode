import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import { compare, hash } from 'bcryptjs';

export async function POST(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the data from the request
    const data = await request.json();
    const { currentPassword, newPassword } = data;

    // Validate the data
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Fetch the user
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        password: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: 'User not found or using social login' },
        { status: 404 }
      );
    }

    // Verify the current password
    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 12);

    // Update the user's password
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, message: 'Error changing password' },
      { status: 500 }
    );
  }
} 
