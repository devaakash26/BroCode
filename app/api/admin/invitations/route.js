import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma, disconnectPrisma } from '@/app/lib/db';
import { createRandomToken } from '@/app/lib/utils';
import { sendInvitationEmail } from '@/app/lib/email';

export async function POST(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get email and role from request body
    const { email, role } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if an invitation with this email already exists
    try {
      const existingInvitation = await prisma.userInvitation.findFirst({
        where: { email },
      });

      if (existingInvitation) {
        // Delete the existing invitation
        await prisma.userInvitation.delete({
          where: { id: existingInvitation.id },
        });
      }
    } catch (error) {
      console.log('No existing invitation found or table does not exist yet');
    }

    // Create a token
    const token = createRandomToken();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create a record in verification tokens instead of UserInvitation
    // This is a workaround if the UserInvitation model is not yet available
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Build invitation link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationLink = `${appUrl}/auth/register?token=${token}&email=${encodeURIComponent(email)}&role=${role || 'USER'}`;

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      to: email,
      invitationLink,
      role: role || 'USER',
      inviterName: session.user.name || 'Admin',
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: 'Failed to send invitation email', error: emailResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Invitation sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error sending invitation',
        error: error.message 
      },
      { status: 500 }
    );
  } finally {
    await disconnectPrisma();
  }
}

export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all invitations from verification tokens where the identifier has '@' (is an email)
    const invitations = await prisma.verificationToken.findMany({
      where: {
        identifier: {
          contains: '@'
        },
        expires: {
          gt: new Date()
        }
      },
      orderBy: {
        expires: 'desc',
      }
    });

    // Format for response
    const formattedInvitations = invitations.map(invitation => ({
      id: invitation.token,
      email: invitation.identifier,
      expires: invitation.expires,
      createdAt: invitation.expires ? new Date(invitation.expires.getTime() - 7 * 24 * 60 * 60 * 1000) : null,
    }));

    return NextResponse.json(
      { 
        success: true, 
        invitations: formattedInvitations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching invitations',
        error: error.message 
      },
      { status: 500 }
    );
  } finally {
    await disconnectPrisma();
  }
}

export async function DELETE(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Delete the invitation
    await prisma.verificationToken.delete({
      where: {
        token,
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Invitation deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error deleting invitation',
        error: error.message 
      },
      { status: 500 }
    );
  } finally {
    await disconnectPrisma();
  }
} 