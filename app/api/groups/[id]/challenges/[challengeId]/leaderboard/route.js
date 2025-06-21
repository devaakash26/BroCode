import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

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
    
    // Check if the challenge exists and belongs to the group
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: challengeId,
        groupId,
      },
      select: {
        startTime: true,
        endTime: true,
        realTimeLeaderboard: true,
      }
    });
    
    if (!challenge) {
      return NextResponse.json(
        { message: 'Challenge not found' },
        { status: 404 }
      );
    }
    
    // Check if the user is a member of the group
    const userGroup = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId,
      },
    });
    
    const isGroupMember = !!userGroup;
    
    if (!isGroupMember) {
      return NextResponse.json(
        { message: 'You are not a member of this group' },
        { status: 403 }
      );
    }
    
    // Get all submissions for this challenge
    const submissions = await prisma.submission.findMany({
      where: {
        challengeId,
        status: 'ACCEPTED', // Only count accepted submissions
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'asc', // Earlier submissions first
      },
    });
    
    // Process submissions to create the leaderboard
    const userMap = new Map();
    
    submissions.forEach(submission => {
      const userId = submission.user.id;
      
      // Calculate points based on difficulty
      let points = 0;
      switch (submission.problem.difficulty) {
        case 'EASY':
          points = 100;
          break;
        case 'MEDIUM':
          points = 200;
          break;
        case 'HARD':
          points = 300;
          break;
        default:
          points = 100;
      }
      
      // Add bonus points for early submission
      // This could be refined based on your scoring algorithm
      
      // If this user is already in the map
      if (userMap.has(userId)) {
        const userData = userMap.get(userId);
        
        // If this problem is not already solved by this user
        if (!userData.solvedProblems.has(submission.problem.id)) {
          userData.solvedProblems.add(submission.problem.id);
          userData.score += points;
          userData.problemsSolved += 1;
        }
      } else {
        // First time seeing this user
        userMap.set(userId, {
          user: {
            id: userId,
            name: submission.user.name,
            image: submission.user.image,
          },
          score: points,
          problemsSolved: 1,
          solvedProblems: new Set([submission.problem.id]),
        });
      }
    });
    
    // Convert the map to an array and sort by score
    const leaderboard = Array.from(userMap.values())
      .map(entry => ({
        user: entry.user,
        score: entry.score,
        problemsSolved: entry.problemsSolved,
      }))
      .sort((a, b) => b.score - a.score || b.problemsSolved - a.problemsSolved);
    
    // Add ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    // Check if the challenge has started
    const now = new Date();
    const hasStarted = now >= challenge.startTime;
    const hasEnded = now >= challenge.endTime;
    
    // Only return real data if challenge has started or if real-time leaderboard is enabled
    if (hasStarted || challenge.realTimeLeaderboard) {
      return NextResponse.json({
        leaderboard,
        status: {
          hasStarted,
          hasEnded,
        },
      });
    } else {
      // Return empty leaderboard if challenge hasn't started
      return NextResponse.json({
        leaderboard: [],
        status: {
          hasStarted: false,
          hasEnded: false,
          message: "Leaderboard will be available once the challenge begins."
        },
      });
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { message: 'Error fetching leaderboard', error: error.message },
      { status: 500 }
    );
  }
} 