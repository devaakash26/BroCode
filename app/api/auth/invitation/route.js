import { NextResponse } from 'next/server';
import { prisma, disconnectPrisma } from '@/app/lib/db';

// Handler for validating invitation tokens and retrieving invitation information
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invitation token is required' 
      }, { status: 400 });
    }

    // Find the invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: {
        token,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    });

    if (!invitation) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired invitation' 
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

    // Return invitation details (excluding token for security)
    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        inviter: invitation.inviter,
      }
    });
  } catch (error) {
    console.error('Error retrieving invitation:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve invitation', 
      details: error.message 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 
