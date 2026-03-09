import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";

// GET handler for fetching the current user's profile
export async function GET(request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
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
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Run all profile queries in parallel via $transaction
    const [
      submissions,
      totalSubmissions,
      acceptedSubmissions,
      uniqueAccepted,
      streakDays,
    ] = await prisma.$transaction([
      // Recent submissions for display
      prisma.submission.findMany({
        where: { userId: user.id },
        orderBy: { submittedAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          language: true,
          runtime: true,
          submittedAt: true,
          problem: {
            select: { title: true, id: true },
          },
        },
      }),
      prisma.submission.count({
        where: { userId: user.id },
      }),
      prisma.submission.count({
        where: { userId: user.id, status: "ACCEPTED" },
      }),
      // Unique solved problems — use distinct
      prisma.submission.findMany({
        where: { userId: user.id, status: "ACCEPTED" },
        select: { problemId: true },
        distinct: ["problemId"],
      }),
      // Streak: get distinct submission dates for last 365 days in one query
      prisma.submission.findMany({
        where: {
          userId: user.id,
          submittedAt: {
            gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
        select: { submittedAt: true },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    // Format submissions for the frontend
    const formattedSubmissions = submissions.map((sub) => ({
      id: sub.id,
      problemName: sub.problem.title,
      problemId: sub.problem.id,
      status: sub.status,
      language: sub.language,
      runtime: sub.runtime,
      date: sub.submittedAt,
    }));

    const problemsSolved = uniqueAccepted.length;

    const successRate =
      totalSubmissions > 0
        ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
        : 0;

    // Calculate streak from the fetched dates — no extra DB calls
    const submissionDateSet = new Set(
      streakDays.map((s) => s.submittedAt.toISOString().split("T")[0]),
    );
    let streak = 0;
    const currentDate = new Date();
    while (true) {
      const dateStr = currentDate.toISOString().split("T")[0];
      if (submissionDateSet.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Return the user details with submissions, activities, and stats
    const response = NextResponse.json({
      success: true,
      user: {
        ...user,
        emailVerified: !!user.emailVerified,
        submissions: formattedSubmissions,
        problemsSolved,
        successRate,
        streak,
        contestsParticipated: 0,
      },
    });
    response.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60",
    );
    return response;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching user profile" },
      { status: 500 },
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
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get the data from the request
    const data = await request.json();
    const { name, leetcodeUsername } = data;

    const updateData = {};
    if (name) {
      if (typeof name !== "string" || name.trim() === "") {
        return NextResponse.json(
          { success: false, message: "Name is required" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    if (leetcodeUsername !== undefined) {
      if (typeof leetcodeUsername !== "string") {
        return NextResponse.json(
          { success: false, message: "Invalid LeetCode username" },
          { status: 400 },
        );
      }
      updateData.leetcodeUsername = leetcodeUsername.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "No data provided to update" },
        { status: 400 },
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
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { success: false, message: "Error updating user profile" },
      { status: 500 },
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
        { success: false, message: "Unauthorized" },
        { status: 401 },
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
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user account:", error);
    return NextResponse.json(
      { success: false, message: "Error deleting user account" },
      { status: 500 },
    );
  }
}
