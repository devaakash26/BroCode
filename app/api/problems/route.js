import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;
    const difficulty = searchParams.get('difficulty');
    const tag = searchParams.get('tag');
    const status = searchParams.get('status'); // 'solved', 'unsolved', 'all'
    const search = searchParams.get('search') || '';

    // Build the where clause
    const where = {
      isPublic: true,
    };

    // Add difficulty filter
    if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(difficulty.toUpperCase())) {
      where.difficulty = difficulty.toUpperCase();
    }

    // Add tag filter (using array contains)
    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    // Add title search
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Query problems
    const problems = await prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        difficulty: true,
        tags: true,
        submissions: status ? {
          where: {
            userId: session.user.id,
            status: 'ACCEPTED',
          },
          take: 1,
        } : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Format problems with solved status
    const formattedProblems = problems.map(problem => ({
      ...problem,
      solved: problem.submissions?.length > 0 || false,
    }));

    // Filter by status if specified
    let filteredProblems = formattedProblems;
    if (status === 'solved') {
      filteredProblems = formattedProblems.filter(p => p.solved);
    } else if (status === 'unsolved') {
      filteredProblems = formattedProblems.filter(p => !p.solved);
    }

    // Get total count for pagination
    const totalCount = await prisma.problem.count({
      where,
    });

    return NextResponse.json({
      problems: filteredProblems,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching problems:', error);
    return NextResponse.json(
      { message: 'Error fetching problems', error: error.message },
      { status: 500 }
    );
  }
} 
