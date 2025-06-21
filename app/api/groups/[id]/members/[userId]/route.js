import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, disconnectPrisma } from '@/app/lib/db';

// Handler for removing a member from a group
export async function DELETE(request, { params }) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId, userId: targetUserId } = params;

    // Get the group to check permissions
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true }
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // Check if user is the creator of the group
    const isCreator = group.creatorId === session.user.id;

    // Get user's role in the group
    const userMembership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: groupId,
        },
      },
    });

    // Check if user is admin
    const isAdmin = userMembership?.role === 'ADMIN';

    // Only admins and the creator can remove members
    if (!isAdmin && !isCreator) {
      return NextResponse.json({ 
        success: false, 
        error: 'You do not have permission to remove members' 
      }, { status: 403 });
    }

    // Get target user's membership
    const targetMembership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId: groupId,
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json({ success: false, error: 'User is not a member of this group' }, { status: 404 });
    }

    // Don't allow removing the creator
    if (targetUserId === group.creatorId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot remove the group creator' 
      }, { status: 403 });
    }

    // Regular admins can't remove other admins, only the creator can
    if (targetMembership.role === 'ADMIN' && !isCreator) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only the group creator can remove admins' 
      }, { status: 403 });
    }

    // Remove the user from the group
    await prisma.userGroup.delete({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId: groupId,
        },
      },
    });

    // Update the member count
    await prisma.group.update({
      where: { id: groupId },
      data: {
        currentMembers: {
          decrement: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to remove member' 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
}

// Handler for updating a member's role
export async function PATCH(request, { params }) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: groupId, userId: targetUserId } = params;
    const data = await request.json();
    const { role } = data;

    // Validate role
    if (role !== 'ADMIN' && role !== 'MEMBER') {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    // Get the group to check permissions
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true }
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // Only the creator can change roles
    if (group.creatorId !== session.user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only the group creator can modify member roles' 
      }, { status: 403 });
    }

    // Check if the target user is a member of the group
    const targetMembership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId: groupId,
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json({ success: false, error: 'User is not a member of this group' }, { status: 404 });
    }

    // Don't allow changing the role of the creator
    if (targetUserId === group.creatorId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot change the role of the group creator' 
      }, { status: 403 });
    }

    // Update the user's role
    await prisma.userGroup.update({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId: groupId,
        },
      },
      data: { role }
    });

    return NextResponse.json({
      success: true,
      message: `Member role updated to ${role}`
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update member role' 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 