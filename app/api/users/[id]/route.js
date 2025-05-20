import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const userId = params.id;
  
  try {
    // Fetch the user with their submissions and groups
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        submissions: {
          where: {
            status: 'ACCEPTED',
          },
          orderBy: {
            submittedAt: 'desc',
          },
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                description: true,
                tags: true,
              }
            },
          },
        },
        userGroups: {
          include: {
            group: {
              include: {
                _count: {
                  select: { members: true }
                }
              }
            }
          }
        }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Count unique solved problems by difficulty
    const solvedProblemIds = new Set();
    const recentActivity = [];
    const difficultyCount = { easy: 0, medium: 0, hard: 0 };
    
    // Get 30 days ago date for recent activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Process submissions
    user.submissions.forEach(submission => {
      const problemId = submission.problemId;
      
      // If this is a new solved problem, count it
      if (!solvedProblemIds.has(problemId)) {
        solvedProblemIds.add(problemId);
        
        // Count by difficulty
        if (submission.problem?.difficulty === 'EASY') difficultyCount.easy++;
        else if (submission.problem?.difficulty === 'MEDIUM') difficultyCount.medium++;
        else if (submission.problem?.difficulty === 'HARD') difficultyCount.hard++;
        
        // Add to recent activity if within last 30 days (up to 3 items)
        if (submission.submittedAt > thirtyDaysAgo && recentActivity.length < 3) {
          recentActivity.push({
            id: submission.id,
            problemName: submission.problem?.title || 'Unknown Problem',
            difficulty: submission.problem?.difficulty || 'MEDIUM',
            solvedAt: getTimeAgo(submission.submittedAt),
          });
        }
      }
    });

    // Process user's groups
    const userGroups = user.userGroups.map(userGroup => ({
      id: userGroup.group.id,
      name: userGroup.group.name,
      memberCount: userGroup.group._count?.members || 0,
      isPublic: true // Assuming all groups are public, adjust as needed
    }));

    // Format response data
    const responseData = {
      id: user.id,
      name: user.name || 'Anonymous User',
      image: user.image,
      joinDate: formatDate(user.createdAt || new Date()),
      solvedProblems: {
        total: solvedProblemIds.size,
        easy: difficultyCount.easy,
        medium: difficultyCount.medium,
        hard: difficultyCount.hard
      },
      recentActivity,
      groups: userGroups
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

// Helper function to format date as "Month Year"
function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper function to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
} 