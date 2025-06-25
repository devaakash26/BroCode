import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

async function getProblems(userId) {
  const problems = await prisma.problem.findMany({
    where: {
      isPublic: true,
    },
    select: {
      id: true,
      title: true,
      difficulty: true,
      submissions: {
        where: {
          userId,
          status: 'ACCEPTED',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return problems.map(problem => ({
    ...problem,
    solved: problem.submissions.length > 0,
    submissions: undefined,
  }));
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const problems = await getProblems(userId);
    return NextResponse.json(problems);
  } catch (error) {
    console.error('Error fetching problems for drawer:', error);
    return NextResponse.json({ message: 'Error fetching problems' }, { status: 500 });
  }
} 