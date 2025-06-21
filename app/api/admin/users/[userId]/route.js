import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, disconnectPrisma } from '@/app/lib/db';

export async function GET(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.userId;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Fetch user with related data
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        userGroups: {
          include: {
            group: true,
          },
        },
        submissions: {
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
              },
            },
          },
          orderBy: {
            submittedAt: 'desc',
          },
          take: 10,
        },
        problemsCreated: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            createdAt: true,
          },
        },
        groupsCreated: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get submission stats
    const submissionStats = await prisma.submission.groupBy({
      by: ['status'],
      where: {
        userId: userId,
      },
      _count: true,
    });

    // Format the response
    const formattedUser = {
      ...user,
      isVerified: !!user.emailVerified,
      submissionStats: submissionStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {}),
      totalSubmissions: await prisma.submission.count({
        where: {
          userId: userId,
        },
      }),
      uniqueProblemsSolved: await prisma.problem.count({
        where: {
          submissions: {
            some: {
              userId: userId,
              status: 'ACCEPTED',
            },
          },
        },
      }),
      groups: user.userGroups.map(ug => ({
        id: ug.group.id,
        name: ug.group.name,
        role: ug.role,
        joinedAt: ug.joinedAt,
        description: ug.group.description,
      })),
    };

    return NextResponse.json({ success: true, user: formattedUser });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user details' }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 