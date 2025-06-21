import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

// Get details of a specific challenge
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id: groupId, challengeId } = params;
    
    // First, check if the user is a member of the group
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId,
      },
      select: {
        role: true,
      }
    });
    
    // Also check if user is the creator of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { 
        creatorId: true,
        name: true
      }
    });
    
    if (!group) {
      return NextResponse.json(
        { message: 'Group not found' },
        { status: 404 }
      );
    }
    
    const isCreator = group.creatorId === session.user.id;
    const isAdmin = userGroup?.role === 'ADMIN';
    const isMember = !!userGroup;
    
    if (!isMember && !isCreator) {
      return NextResponse.json(
        { message: 'You are not a member of this group' },
        { status: 403 }
      );
    }
    
    // Get the challenge with problems
    const challenge = await prisma.challenge.findUnique({
      where: { 
        id: challengeId,
        groupId, // Ensure it belongs to the right group
      },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        isActive: true,
        visibleToParticipants: true,
        createdAt: true,
        updatedAt: true,
        groupId: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
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
                tags: true,
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
    
    if (!challenge) {
      return NextResponse.json(
        { message: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // If challenge is not public and user is not an admin/creator
    // and the challenge hasn't started yet, restrict access
    const now = new Date();
    if (
      !challenge.visibleToParticipants && 
      !isAdmin && 
      !isCreator && 
      now < challenge.startTime
    ) {
      return NextResponse.json(
        { message: 'You do not have access to this challenge yet' },
        { status: 403 }
      );
    }
    
    // Get participant count
    const participantCount = await prisma.submission.findMany({
      where: {
        challengeId,
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    }).then(results => results.length);
    
    // Format problems
    const formattedProblems = challenge.problems.map(p => ({
      id: p.problem.id,
      title: p.problem.title,
      difficulty: p.problem.difficulty,
      tags: p.problem.tags || [],
    }));
    
    return NextResponse.json({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      startTime: challenge.startTime,
      endTime: challenge.endTime,
      isPublic: challenge.visibleToParticipants,
      creator: challenge.creator,
      problems: formattedProblems,
      participants: participantCount,
      submissionCount: challenge._count.submissions,
      group: {
        id: groupId,
        name: group.name
      }
    });
  } catch (error) {
    console.error('Error fetching challenge details:', error);
    return NextResponse.json(
      { message: 'Error fetching challenge details', error: error.message },
      { status: 500 }
    );
  }
} 