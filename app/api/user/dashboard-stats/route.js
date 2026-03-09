import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // Run all independent queries in parallel with $transaction
    const [
      submissionCount,
      groupCount,
      solvedProblemIds,
      upcomingChallenges,
      recentSubmissions,
    ] = await prisma.$transaction([
      prisma.submission.count({
        where: { userId },
      }),
      prisma.userGroup.count({
        where: { userId },
      }),
      // Instead of counting problems with a nested relation filter,
      // get distinct accepted problemIds — much faster with an index
      prisma.submission.findMany({
        where: { userId, status: "ACCEPTED" },
        select: { problemId: true },
        distinct: ["problemId"],
      }),
      prisma.challenge.findMany({
        where: {
          startTime: { gt: new Date() },
          group: {
            members: { some: { userId } },
          },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          group: {
            select: { id: true, name: true },
          },
        },
        take: 3,
        orderBy: { startTime: "asc" },
      }),
      // Only select the fields the dashboard actually uses
      prisma.submission.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          language: true,
          submittedAt: true,
          problemId: true,
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
            },
          },
        },
        take: 5,
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    const response = NextResponse.json({
      success: true,
      stats: {
        submissionCount,
        groupCount,
        problemsSolved: solvedProblemIds.length,
        upcomingChallenges,
        recentSubmissions,
      },
    });

    // Cache for 60 seconds — dashboard data doesn't need to be real-time
    response.headers.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=120",
    );
    return response;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching dashboard stats" },
      { status: 500 },
    );
  }
}
