import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { cache } from "@/lib/redis";

export async function GET() {
  console.log("[Dashboard Stats API] ===== REQUEST RECEIVED =====");
  try {
    const session = await getServerSession(authOptions);
    console.log("[Dashboard Stats API] Session retrieved:", session?.user?.id);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // Check cache first
    console.log("[Dashboard Stats API] Checking cache for user:", userId);
    // Dynamic cache key definition using the convention
    const cacheKey = `brocode-dashboard-stats-${userId}`;
    const cachedStats = await cache.get(cacheKey);
    console.log(
      "[Dashboard Stats API] Cache result:",
      cachedStats ? "HIT" : "MISS",
    );
    if (cachedStats) {
      console.log("[Dashboard Stats API] Returning cached stats");
      return NextResponse.json(cachedStats);
    }
    console.log("[Dashboard Stats API] Fetching from database...");

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

    const statsData = {
      success: true,
      stats: {
        submissionCount,
        groupCount,
        problemsSolved: solvedProblemIds.length,
        upcomingChallenges,
        recentSubmissions,
      },
    };

    // Cache the stats (1 hour TTL)
    console.log("[Dashboard Stats API] Attempting to cache stats");
    try {
      await cache.set(cacheKey, statsData, 3600); // 1 hour = 3600 seconds
      console.log("[Dashboard Stats API] Stats cached successfully");
    } catch (cacheError) {
      console.error("[Dashboard Stats API] Cache error:", cacheError);
    }

    const response = NextResponse.json(statsData);

    // Cache for 1 hour — dashboard data doesn't need to be real-time
    response.headers.set(
      "Cache-Control",
      "private, max-age=3600, stale-while-revalidate=7200",
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
