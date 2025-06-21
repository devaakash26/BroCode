import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma, disconnectPrisma } from '@/app/lib/db';

// GET handler for fetching all problems
export async function GET(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all problems with additional information
    const problems = await prisma.problem.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        createdAt: true,
        updatedAt: true,
        categories: {
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    // Calculate acceptance rate
    const problemsWithStats = await Promise.all(
      problems.map(async (problem) => {
        const totalSubmissions = problem._count.submissions;
        
        let acceptedSubmissions = 0;
        if (totalSubmissions > 0) {
          acceptedSubmissions = await prisma.submission.count({
            where: {
              problemId: problem.id,
              status: 'ACCEPTED',
            },
          });
        }
        
        const acceptanceRate = totalSubmissions > 0 
          ? Math.round((acceptedSubmissions / totalSubmissions) * 100) 
          : 0;

        // Format the categories
        const categories = problem.categories.map(c => c.category.name);
        
        return {
          id: problem.id,
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          categories,
          submissionCount: totalSubmissions,
          acceptanceRate,
          createdAt: problem.createdAt,
          updatedAt: problem.updatedAt,
        };
      })
    );

    return NextResponse.json({ success: true, problems: problemsWithStats });
  } catch (error) {
    console.error('Error fetching problems:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch problems' }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
}

// POST handler for creating a new problem
export async function POST(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body with better error handling
    let data;
    try {
      data = await request.json();
      console.log("Received data:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error parsing request body:', err);
      return NextResponse.json({ 
        success: false, 
        error: `Invalid JSON in request body: ${err.message}` 
      }, { status: 400 });
    }
    
    // Validate input data
    if (!data.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    
    if (!data.description) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }
    
    if (!data.difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(data.difficulty)) {
      return NextResponse.json({ success: false, error: 'Valid difficulty is required' }, { status: 400 });
    }
    
    if (!data.categories || !Array.isArray(data.categories) || data.categories.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one category is required' }, { status: 400 });
    }
    
    console.log("Creating problem with template code:", JSON.stringify(data.templateCode, null, 2));
    
    // Create the problem in a transaction
    const result = await prisma.$transaction(async (tx) => {
      try {
        // First, ensure the templateCode is valid JSON
        let templateCodeJson = {};
        if (data.templateCode) {
          if (typeof data.templateCode === 'string') {
            try {
              templateCodeJson = JSON.parse(data.templateCode);
            } catch (e) {
              console.error("Invalid templateCode JSON:", e);
              templateCodeJson = {}; // Default to empty object on error
            }
          } else if (typeof data.templateCode === 'object') {
            templateCodeJson = data.templateCode;
          }
        }
        
        // Create the problem with safe values
        const problem = await tx.problem.create({
          data: {
            title: data.title,
            description: data.description,
            difficulty: data.difficulty,
            exampleInput: data.exampleInput || '',
            exampleOutput: data.exampleOutput || '',
            constraints: data.constraints || '',
            solution: data.solution || '',
            timeComplexity: data.timeComplexity || 'O(n)',
            spaceComplexity: data.spaceComplexity || 'O(n)',
            templateCode: templateCodeJson,
            tags: data.tags || [],
            creatorId: session.user.id
          }
        });
        
        // Then, add categories to the problem
        for (const categoryName of data.categories) {
          // Upsert the category (create if not exist)
          const category = await tx.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });
          
          // Create the relationship between problem and category
          await tx.problemCategory.create({
            data: {
              problemId: problem.id,
              categoryId: category.id,
            }
          });
        }
        
        // Create test cases if provided
        if (data.testCases && Array.isArray(data.testCases) && data.testCases.length > 0) {
          await tx.testCase.createMany({
            data: data.testCases.map(tc => ({
              problemId: problem.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              explanation: tc.explanation || '',
              isHidden: tc.isHidden || false,
            }))
          });
        }
        
        return problem;
      } catch (error) {
        console.error('Error in transaction:', error);
        throw error;
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Problem created successfully',
      problemId: result.id
    });
  } catch (error) {
    console.error('Error creating problem:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to create problem: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
}

// DELETE handler for deleting a problem
export async function DELETE(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('id');

    if (!problemId) {
      return NextResponse.json({ success: false, error: 'Problem ID is required' }, { status: 400 });
    }

    // Delete the problem
    await prisma.problem.delete({
      where: {
        id: problemId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting problem:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete problem' }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
}

// PUT handler for updating a problem
export async function PUT(request) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let data;
    try {
      data = await request.json();
      console.log("Received update data:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error parsing request body:', err);
      return NextResponse.json({ 
        success: false, 
        error: `Invalid JSON in request body: ${err.message}` 
      }, { status: 400 });
    }
    
    // Validate input data
    if (!data.id) {
      return NextResponse.json({ success: false, error: 'Problem ID is required' }, { status: 400 });
    }

    if (!data.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    
    if (!data.description) {
      return NextResponse.json({ success: false, error: 'Description is required' }, { status: 400 });
    }
    
    if (!data.difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(data.difficulty)) {
      return NextResponse.json({ success: false, error: 'Valid difficulty is required' }, { status: 400 });
    }
    
    if (!data.categories || !Array.isArray(data.categories) || data.categories.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one category is required' }, { status: 400 });
    }
    
    // Update the problem in a transaction
    const result = await prisma.$transaction(async (tx) => {
      try {
        // First, ensure the templateCode is valid JSON
        let templateCodeJson = {};
        if (data.templateCode) {
          if (typeof data.templateCode === 'string') {
            try {
              templateCodeJson = JSON.parse(data.templateCode);
            } catch (e) {
              console.error("Invalid templateCode JSON:", e);
              templateCodeJson = {}; // Default to empty object on error
            }
          } else if (typeof data.templateCode === 'object') {
            templateCodeJson = data.templateCode;
          }
        }
        
        // Update the problem basic info
        const problem = await tx.problem.update({
          where: { id: data.id },
          data: {
            title: data.title,
            description: data.description,
            difficulty: data.difficulty,
            exampleInput: data.exampleInput || '',
            exampleOutput: data.exampleOutput || '',
            constraints: data.constraints || '',
            solution: data.solution || '',
            timeComplexity: data.timeComplexity || 'O(n)',
            spaceComplexity: data.spaceComplexity || 'O(n)',
            templateCode: templateCodeJson,
            tags: data.tags || [],
          }
        });
        
        // Delete existing category relationships
        await tx.problemCategory.deleteMany({
          where: { problemId: data.id }
        });
        
        // Add new category relationships
        for (const categoryName of data.categories) {
          // Upsert the category (create if not exist)
          const category = await tx.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName },
          });
          
          // Create the relationship between problem and category
          await tx.problemCategory.create({
            data: {
              problemId: problem.id,
              categoryId: category.id,
            }
          });
        }
        
        // If testCases are provided, update them
        if (data.testCases && Array.isArray(data.testCases)) {
          // Delete existing test cases
          await tx.testCase.deleteMany({
            where: { problemId: data.id }
          });
          
          // Create new test cases
          if (data.testCases.length > 0) {
            await tx.testCase.createMany({
              data: data.testCases.map(tc => ({
                problemId: problem.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                explanation: tc.explanation || '',
                isHidden: tc.isHidden || false,
              }))
            });
          }
        }
        
        return problem;
      } catch (error) {
        console.error('Error in transaction:', error);
        throw error;
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Problem updated successfully',
      problemId: result.id
    });
  } catch (error) {
    console.error('Error updating problem:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to update problem: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    await disconnectPrisma();
  }
} 
