import { NextResponse } from 'next/server';
import { prisma, disconnectPrisma } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/app/lib/email';

// Handler for accepting invitations and creating user accounts
export async function POST(request) {
  try {
    const data = await request.json();
    const { token, name, password } = data;

    if (!token || !name || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token, name, and password are required' 
      }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 });
    }

    // Find the invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: {
        token,
      }
    });

    if (!invitation) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid invitation token' 
      }, { status: 404 });
    }

    // Check if invitation is already accepted
    if (invitation.isAccepted) {
      return NextResponse.json({ 
        success: false, 
        error: 'This invitation has already been accepted' 
      }, { status: 400 });
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ 
        success: false, 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: invitation.email,
      }
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        error: 'A user with this email already exists' 
      }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const now = new Date();
    const user = await prisma.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashedPassword,
        role: invitation.role,
        emailVerified: now, // Auto-verify email since it was sent via invitation
      }
    });

    // Mark invitation as accepted
    await prisma.userInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        isAccepted: true
      }
    });

    // Send welcome email
    await sendWelcomeEmail({
      to: user.email,
      name: user.name
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to accept invitation', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 
