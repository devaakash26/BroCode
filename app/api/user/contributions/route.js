import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

// GET handler for fetching user contribution data
export async function GET(request) {
  try {
    // Get the search params from the request URL
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // If userId is not provided, use the current user's ID
    const targetUserId = userId || session.user.id;
    
    // Get the contribution data for the past year
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    // Fetch all submissions for the user within the past year
    const submissions = await prisma.submission.findMany({
      where: {
        userId: targetUserId,
        createdAt: {
          gte: oneYearAgo
        }
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Process submissions to get contribution data by day
    const contributionMap = new Map();
    
    for (const submission of submissions) {
      const dateStr = submission.createdAt.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      if (contributionMap.has(dateStr)) {
        contributionMap.set(dateStr, contributionMap.get(dateStr) + 1);
      } else {
        contributionMap.set(dateStr, 1);
      }
    }
    
    // Convert to array format expected by the frontend
    const contributionData = Array.from(contributionMap).map(([date, count]) => ({
      date,
      count: Math.min(count, 4) // Cap at 4 for display purposes
    }));
    
    // Return the contribution data
    return NextResponse.json({
      success: true,
      contributionData
    });
    
  } catch (error) {
    console.error('Error fetching contribution data:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching contribution data' },
      { status: 500 }
    );
  }
} 
