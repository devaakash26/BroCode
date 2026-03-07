import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import { nanoid } from 'nanoid';

// POST /api/groups/[id]/invites - Generate or refresh invite links and codes
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the group
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if the user is an admin of the group
    if (group.members.length === 0 && group.creatorId !== session.user.id) {
      return NextResponse.json(
        { message: 'Only group admins can manage invites' },
        { status: 403 }
      );
    }

    // Generate a new invite code (8 characters)
    const inviteCode = nanoid(8);
    
    // Create the base URL for invite links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/groups/join?code=${inviteCode}`;
    
    // Update the group with the new invite code and link
    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        inviteCode,
        inviteLink,
      },
    });

    const freshBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const freshInviteLink = `${freshBaseUrl}/groups/join?code=${updatedGroup.inviteCode}`;

    return NextResponse.json({
      inviteCode: updatedGroup.inviteCode,
      inviteLink: freshInviteLink,
      message: 'Invite link refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing invite:', error);
    return NextResponse.json(
      { 
        message: 'Error refreshing invite',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/groups/[id]/invites - Get invite information
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the group
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if the user is a member of the group
    if (group.members.length === 0 && group.creatorId !== session.user.id) {
      return NextResponse.json(
        { message: 'You do not have permission to view this group' },
        { status: 403 }
      );
    }

    // Always reconstruct from the env var so stale DB values (e.g. localhost) are never used
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = group.inviteCode
      ? `${baseUrl}/groups/join?code=${group.inviteCode}`
      : null;

    // Persist the corrected link so other queries stay consistent
    if (group.inviteCode && group.inviteLink !== inviteLink) {
      await prisma.group.update({
        where: { id },
        data: { inviteLink },
      });
    }

    return NextResponse.json({
      inviteCode: group.inviteCode,
      inviteLink,
    });
  } catch (error) {
    console.error('Error fetching invite info:', error);
    return NextResponse.json(
      { 
        message: 'Error fetching invite information',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
} 