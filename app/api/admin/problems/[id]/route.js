import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, disconnectPrisma } from '@/app/lib/db';

// GET handler for fetching a single problem with all details
export async function GET(request, { params }) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const problemId = params.id;
    
    // Fetch the problem with all related data
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        categories: {
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        testCases: {
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            explanation: true,
            isHidden: true,
          },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ success: false, error: 'Problem not found' }, { status: 404 });
    }

    // Format the problem data for return
    const formattedProblem = {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      exampleInput: problem.exampleInput,
      exampleOutput: problem.exampleOutput,
      constraints: problem.constraints,
      solution: problem.solution,
      timeComplexity: problem.timeComplexity,
      spaceComplexity: problem.spaceComplexity,
      templateCode: problem.templateCode,
      tags: problem.tags,
      categories: problem.categories.map(c => c.category.name),
      testCases: problem.testCases,
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };

    return NextResponse.json({ success: true, problem: formattedProblem });
  } catch (error) {
    console.error('Error fetching problem:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to fetch problem: ${error.message}` 
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 