import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, disconnectPrisma } from '@/app/lib/db';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
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
        testCasesRel: {
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
      return NextResponse.json(
        { message: 'Problem not found' },
        { status: 404 }
      );
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
      templateCode: problem.templateCode,
      tags: problem.tags,
      categories: problem.categories.map(c => c.category.name),
      testCases: problem.testCasesRel.filter(tc => !tc.isHidden),
      createdAt: problem.createdAt,
      updatedAt: problem.updatedAt,
    };

    return NextResponse.json(formattedProblem);
  } catch (error) {
    console.error('Error fetching problem:', error);
    return NextResponse.json(
      { message: 'Error fetching problem', error: error.message },
      { status: 500 }
    );
  } finally {
    await disconnectPrisma();
  }
} 