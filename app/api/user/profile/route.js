import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';

// GET handler for fetching the current user's profile
export async function GET(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user's submissions
    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        submittedAt: 'desc',  
      },
      take: 20,
      include: {
        problem: {
          select: {
            title: true,
            id: true,
          },
        },
      },
    });

    // Format submissions for the frontend
    const formattedSubmissions = submissions.map(sub => ({
      id: sub.id,
      problemName: sub.problem.title,
      problemId: sub.problem.id,
      status: sub.status,
      language: sub.language,
      runtime: sub.runtime,
      date: sub.submittedAt,
    }));

    // Calculate additional stats
    const totalSubmissions = await prisma.submission.count({
      where: {
        userId: user.id,
      },
    });

    const acceptedSubmissions = await prisma.submission.count({
      where: {
        userId: user.id,
        status: 'ACCEPTED',
      },
    });

    // Get unique problems solved (without using distinct)
    const uniqueProblems = await prisma.submission.findMany({
      where: {
        userId: user.id,
        status: 'ACCEPTED',
      },
      select: {
        problemId: true,
      },
    });
    
    // Count unique problemIds
    const uniqueProblemIds = new Set(uniqueProblems.map(sub => sub.problemId));
    const problemsSolved = uniqueProblemIds.size;

    const successRate = totalSubmissions > 0 
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100) 
      : 0;

    // Count consecutive days with submissions
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    while (true) {
      // Format date as YYYY-MM-DD
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Check if there's a submission on this day
      const hasSubmission = await prisma.submission.findFirst({
        where: {
          userId: user.id,
          submittedAt: {
            gte: new Date(`${dateStr}T00:00:00.000Z`),
            lt: new Date(`${dateStr}T23:59:59.999Z`),
          },
        },
      });
      
      if (hasSubmission) {
        streak++;
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Return the user details with submissions, activities, and stats
    return NextResponse.json({
      success: true,
      user: {
        ...user,
        emailVerified: !!user.emailVerified,
        submissions: formattedSubmissions,
        problemsSolved,
        successRate,
        streak,
        contestsParticipated: 0, // Fixed value since Contest model doesn't exist
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching user profile' },
      { status: 500 }
    );
  }
}

// PATCH handler for updating the current user's profile
export async function PATCH(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the data from the request
    const data = await request.json();
    const { name, leetcodeUsername } = data;

    const updateData = {};
    if (name) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { success: false, message: 'Name is required' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    
    if (leetcodeUsername !== undefined) {
        if (typeof leetcodeUsername !== 'string') {
            return NextResponse.json(
                { success: false, message: 'Invalid LeetCode username' },
                { status: 400 }
            );
        }
        updateData.leetcodeUsername = leetcodeUsername.trim();
    }

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
            { success: false, message: 'No data provided to update' },
            { status: 400 }
        );
    }
    // Update the user
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        leetcodeUsername: true,
      },
    });

    // Return the updated user
    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { success: false, message: 'Error updating user profile' },
      { status: 500 }
    );
  }
}

// DELETE handler for deleting the current user's account
export async function DELETE(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the user
    await prisma.user.delete({
      where: {
        id: session.user.id,
      },
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { success: false, message: 'Error deleting user account' },
      { status: 500 }
    );
  }
} 
