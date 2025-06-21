import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

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
    const userId = session.user.id;

    // Find the user's membership in the group
    const membership = await prisma.userGroup.findFirst({
      where: {
        userId,
        groupId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { message: "You are not a member of this group." },
        { status: 404 }
      );
    }

    // Prevent the admin from leaving the group
    if (membership.role === 'ADMIN') {
      return NextResponse.json(
        { message: "Admins cannot leave a group. Please delete the group or transfer ownership instead." },
        { status: 403 } // 403 Forbidden is appropriate here
      );
    }

    // If the user is a member, remove them from the group
    await prisma.userGroup.delete({
      where: {
        id: membership.id,
      },
    });

    return NextResponse.json({
      message: 'You have successfully left the group.',
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    return NextResponse.json(
      { message: 'An error occurred while trying to leave the group.', error: error.message },
      { status: 500 }
    );
  }
}
