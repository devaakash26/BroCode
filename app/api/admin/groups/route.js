import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma, disconnectPrisma } from '@/app/lib/db';

// GET handler for fetching all groups
export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all groups with additional information
    const groups = await prisma.group.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            members: true,
            admins: true,
            challenges: true,
          },
        },
      },
    });

    // Format the response
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      isPublic: group.isPublic,
      memberCount: group._count.members,
      adminCount: group._count.admins,
      challengeCount: group._count.challenges,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    return NextResponse.json({ success: true, groups: formattedGroups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch groups' }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
}

// DELETE handler for deleting a group
export async function DELETE(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'Group ID is required' }, { status: 400 });
    }

    // Delete the group
    await prisma.group.delete({
      where: {
        id: groupId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete group' }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 