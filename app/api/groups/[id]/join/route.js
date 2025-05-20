import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/db';
import { sendGroupJoinEmail } from '@/app/lib/email';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const groupId = params.id;

    // Find the group
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        isActive: true,
      },
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if the user is already a member of the group
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { message: 'You are already a member of this group', groupId },
        { status: 200 }
      );
    }

    // Add the user to the group
    await prisma.userGroup.create({
      data: {
        userId: session.user.id,
        groupId,
        role: 'MEMBER', // Default role is MEMBER
      },
    });

    // Update group member count
    await prisma.group.update({
      where: { id: groupId },
      data: { currentMembers: { increment: 1 } },
    });

    // Send email notification
    try {
      await sendGroupJoinEmail({
        to: session.user.email,
        name: session.user.name || 'User',
        groupName: group.name,
        groupDescription: group.description,
      });
      console.log(`Group join email sent to ${session.user.email}`);
    } catch (emailError) {
      console.error('Error sending group join email:', emailError);
      // Don't fail the request if email sending fails
    }

    return NextResponse.json({
      message: 'Successfully joined the group',
      groupId,
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { message: 'Error joining group', error: error.message },
      { status: 500 }
    );
  }
} 