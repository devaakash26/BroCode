import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const submissionCount = await prisma.submission.count({
      where: { userId },
    });

    const groupCount = await prisma.userGroup.count({
      where: { userId },
    });

    const problemsSolved = await prisma.problem.count({
      where: {
        submissions: {
          some: {
            userId,
            status: 'ACCEPTED',
          },
        },
      },
    });

    const upcomingChallenges = await prisma.challenge.findMany({
      where: {
        startTime: {
          gt: new Date(),
        },
        group: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 3,
      orderBy: {
        startTime: 'asc',
      },
    });

    // Get recent activity
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId },
      include: {
        problem: true,
      },
      take: 5,
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      stats: {
        submissionCount,
        groupCount,
        problemsSolved,
        upcomingChallenges,
        recentSubmissions,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching dashboard stats' },
      { status: 500 }
    );
  }
} 
