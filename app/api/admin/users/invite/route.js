import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, disconnectPrisma } from '@/app/lib/db';
import { sendInvitationEmail } from '@/app/lib/email';
import crypto from 'crypto';

// Handler for sending invitation emails
export async function POST(request) {
  try {
    // Check if user is authenticated and is a platform admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const data = await request.json();
    const { email, role } = data;

    // Validate inputs
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['USER', 'GROUP_ADMIN', 'PLATFORM_ADMIN'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      }
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'A user with this email already exists' 
      }, { status: 400 });
    }

    // Check if invitation already exists and is not expired
    const existingInvitation = await prisma.userInvitation.findFirst({
      where: {
        email,
        expiresAt: {
          gt: new Date()
        },
        isAccepted: false
      }
    });

    if (existingInvitation) {
      return NextResponse.json({ 
        success: false, 
        error: 'An invitation has already been sent to this email' 
      }, { status: 400 });
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation record
    const invitation = await prisma.userInvitation.create({
      data: {
        email,
        token,
        role: role || 'USER',
        expiresAt,
        inviterId: session.user.id
      }
    });

    // Generate invitation link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${token}`;

    // Send invitation email
    const emailResult = await sendInvitationEmail({
      to: email,
      inviterName: session.user.name || session.user.email,
      invitationLink,
      role: role || 'USER'
    });

    if (!emailResult.success) {
      // Delete the invitation if email fails to send
      await prisma.userInvitation.delete({
        where: {
          id: invitation.id
        }
      });
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send invitation email', 
        details: emailResult.error 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation sent successfully' 
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send invitation', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 
