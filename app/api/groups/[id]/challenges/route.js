import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

// Create a new challenge in a group
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Session data:', session);
    console.log('User data:', session.user);
    console.log('User ID:', session.user?.id);
    
    if (!session.user?.id) {
      return NextResponse.json(
        { message: 'User ID not found in session' },
        { status: 401 }
      );
    }
    
    const groupId = params.id;
    
    // First, check if the user is the creator of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true }
    });
    
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }
    
    const isCreator = group.creatorId === session.user.id;
    
    // If not the creator, check if the user is an admin of the group
    let hasPermission = isCreator;
    
    if (!hasPermission) {
      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: session.user.id,
          groupId,
          role: 'ADMIN',
        },
      });
      
      hasPermission = !!userGroup;
    }
    
    if (!hasPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to create challenges for this group' },
        { status: 403 }
      );
    }
    
    const { title, description, startTime, endTime, isPublic, problemIds, customProblems, isCustom } = await request.json();
    
    // Validate input for the challenge itself
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { message: 'Missing required fields for challenge' },
        { status: 400 }
      );
    }
    
    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { message: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    if (start >= end) {
      return NextResponse.json(
        { message: 'End time must be after start time' },
        { status: 400 }
      );
    }
    
    // Check if this is a custom challenge with user-created problems
    if (isCustom && Array.isArray(customProblems) && customProblems.length > 0) {
      try {
        // Create the challenge first
        const challenge = await prisma.challenge.create({
          data: {
            title,
            description: description || '',
            startTime: start,
            endTime: end,
            visibleToParticipants: isPublic !== undefined ? isPublic : true,
            group: {
              connect: { id: groupId }
            },
            creator: {
              connect: { id: session.user.id }
            }
          },
        });
      
        // Create custom problems and associate them with the challenge
        for (const customProblem of customProblems) {
          // Create the problem
          const problem = await prisma.problem.create({
            data: {
              title: customProblem.title,
              description: customProblem.description,
              difficulty: customProblem.difficulty,
              exampleInput: customProblem.exampleInput || '',
              exampleOutput: customProblem.exampleOutput || '',
              constraints: customProblem.constraints || '',
              templateCode: customProblem.templateCode || {},
              testCases: customProblem.testCases || [],
              isCustom: true,
              group: {
                connect: { id: groupId }
              },
              creator: {
                connect: { id: session.user.id }
              }
            }
          });
          
          // Link the problem to the challenge
          await prisma.ChallengeProblems.create({
            data: {
              challengeId: challenge.id,
              problemId: problem.id
            }
          });
        }
          
        return NextResponse.json({
          id: challenge.id,
          title: challenge.title,
          message: 'Challenge with custom problems created successfully'
        });
      } catch (error) {
        console.error('Error creating custom challenge:', error);
        return NextResponse.json(
          { message: 'Error creating custom challenge', error: error.message },
          { status: 500 }
        );
      }
    } else if (!Array.isArray(problemIds) || problemIds.length === 0) {
      // Not a custom challenge, but problem IDs are required
      return NextResponse.json(
        { message: 'Problem IDs are required for standard challenges' },
        { status: 400 }
      );
    }
    
    // Standard challenge with existing problems
    try {
      // Create the challenge with existing problems
      const challenge = await prisma.challenge.create({
        data: {
          title,
          description: description || '',
          startTime: start,
          endTime: end,
          visibleToParticipants: isPublic !== undefined ? isPublic : true,
          group: {
            connect: { id: groupId }
          },
          creator: {
            connect: { id: session.user.id }
          },
          problems: {
            create: problemIds.map(problemId => ({
              problem: {
                connect: { id: problemId },
              },
            })),
          },
        },
      });
      
      return NextResponse.json({
        id: challenge.id,
        title: challenge.title,
        message: 'Challenge created successfully'
      });
    } catch (createError) {
      console.error('Failed to create challenge:', createError);
      return NextResponse.json(
        { message: 'Error creating challenge', error: createError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in challenge creation:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

// Get challenges for a group
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const groupId = params.id;
    
    // First, check if the user is the creator of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true }
    });
    
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }
    
    const isCreator = group.creatorId === session.user.id;
    
    // Check if the user is a member of the group
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId,
      },
    });
    
    if (!userGroup && !isCreator) {
      return NextResponse.json(
        { message: 'You are not a member of this group' },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;
    const status = searchParams.get('status'); // 'active', 'upcoming', 'past'
    
    // Build the where clause
    const where = {
      groupId,
    };
    
    // If the user is not an admin or creator, only show public challenges
    const isAdmin = isCreator || (userGroup?.role === 'ADMIN');
    if (!isAdmin) {
      where.visibleToParticipants = true;
    }
    
    // Filter by status
    const now = new Date();
    if (status === 'active') {
      where.startTime = { lte: now };
      where.endTime = { gte: now };
    } else if (status === 'upcoming') {
      where.startTime = { gt: now };
    } else if (status === 'past') {
      where.endTime = { lt: now };
    }
    
    // Get challenges
    const challenges = await prisma.challenge.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        maxScore: true,
        realTimeLeaderboard: true,
        allowLateSubmissions: true,
        visibleToParticipants: true,
        groupId: true,
        creatorId: true,
        creator: {
          select: {
            name: true,
          },
        },
        problems: {
          select: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
              },
            },
          },
        },
        _count: {
          select: {
            problems: true,
            submissions: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
      take: limit,
      skip,
    });
    
    // Get total count for pagination
    const totalCount = await prisma.challenge.count({
      where,
    });
    
    return NextResponse.json({
      challenges,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json(
      { message: 'Error fetching challenges', error: error.message },
      { status: 500 }
    );
  }
} 