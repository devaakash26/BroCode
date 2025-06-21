import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { prisma, disconnectPrisma } from '@/app/lib/db';

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

    // Fetch the group with all necessary data
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            score: 'desc',
          },
        },
        challenges: {
          where: {
            endTime: {
              gt: new Date(),
            },
          },
          orderBy: {
            startTime: 'asc',
          },
          take: 5,
        },
      },
    });

    if (!group) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 });
    }

    const userRole = group.members.find(member => member.userId === session.user.id)?.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'CREATOR';
    const isMember = !!userRole;

    return NextResponse.json({
      success: true,
      group,
      isAdmin,
      isMember,
      userRole: userRole || null,
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json(
      { 
        message: 'Error fetching group details',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the updated data from the request
    const data = await request.json();
    const { name, description } = data;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { message: 'Group name cannot be empty' },
        { status: 400 }
      );
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if the user is an admin or creator
    const isCreator = group.creatorId === session.user.id;
    const isAdmin = isCreator || (group.members.length > 0 && group.members[0].role === 'ADMIN');

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { message: 'You do not have permission to update this group' },
        { status: 403 }
      );
    }

    // Update the group
    const updatedGroup = await prisma.group.update({
      where: { id },
      data: {
        name,
        description
      }
    });

    return NextResponse.json({
      group: updatedGroup,
      message: 'Group updated successfully'
    });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { message: 'Error updating group details' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }

    // Check if the user is the creator or an admin
    const isCreator = group.creatorId === session.user.id;
    const isAdmin = group.members.length > 0 && group.members[0].role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { message: 'Only the group creator or admins can delete this group' },
        { status: 403 }
      );
    }

    // Delete related data first (cascade delete might not work depending on your schema)
    // Delete memberships
    await prisma.userGroup.deleteMany({
      where: { groupId: id }
    });

    // Delete the group
    await prisma.group.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { message: 'Error deleting group' },
      { status: 500 }
    );
  }
} 