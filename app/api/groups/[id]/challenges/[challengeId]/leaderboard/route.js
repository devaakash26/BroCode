import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { redisHelpers } from "@/lib/redis";

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, challengeId } = params;

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    ); // Max 100 per page
    const skip = (page - 1) * limit;

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
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { message: "Challenge not found" },
        { status: 404 },
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
        { message: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // Check cache first (only cache page 1 with default limit)
    if (page === 1 && limit === 50) {
      const cachedLeaderboard = await redisHelpers.getLeaderboard(challengeId);
      if (cachedLeaderboard) {
        return NextResponse.json(cachedLeaderboard);
      }
    }

    // Optimized leaderboard calculation using database aggregation
    // Use raw SQL for better performance with aggregations
    const leaderboardData = await prisma.$queryRaw`
      WITH user_problems AS (
        SELECT DISTINCT ON (s."userId", s."problemId")
          s."userId",
          s."problemId",
          p.difficulty,
          s."submittedAt",
          u.name as "userName",
          u.image as "userImage"
        FROM "Submission" s
        INNER JOIN "User" u ON s."userId" = u.id
        INNER JOIN "Problem" p ON s."problemId" = p.id
        WHERE s."challengeId" = ${challengeId}
          AND s.status = 'ACCEPTED'
        ORDER BY s."userId", s."problemId", s."submittedAt" ASC
      ),
      user_scores AS (
        SELECT 
          "userId",
          "userName",
          "userImage",
          SUM(
            CASE 
              WHEN difficulty = 'EASY' THEN 100
              WHEN difficulty = 'MEDIUM' THEN 200
              WHEN difficulty = 'HARD' THEN 300
              ELSE 100
            END
          ) as score,
          COUNT(DISTINCT "problemId") as "problemsSolved"
        FROM user_problems
        GROUP BY "userId", "userName", "userImage"
      )
      SELECT 
        "userId" as "id",
        "userName" as name,
        "userImage" as image,
        score::int,
        "problemsSolved"::int as "problemsSolved"
      FROM user_scores
      ORDER BY score DESC, "problemsSolved" DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    // Format leaderboard with ranks
    const leaderboard = leaderboardData.map((entry, index) => ({
      rank: skip + index + 1,
      user: {
        id: entry.id,
        name: entry.name,
        image: entry.image,
      },
      score: entry.score,
      problemsSolved: entry.problemsSolved,
    }));

    // Get total participant count for pagination
    const totalParticipants = await prisma.submission.groupBy({
      by: ["userId"],
      where: {
        challengeId,
        status: "ACCEPTED",
      },
      _count: true,
    });

    // Check if the challenge has started
    const now = new Date();
    const hasStarted = now >= challenge.startTime;
    const hasEnded = now >= challenge.endTime;

    // Only return real data if challenge has started or if real-time leaderboard is enabled
    if (hasStarted || challenge.realTimeLeaderboard) {
      const totalCount = totalParticipants.length;
      const responseData = {
        leaderboard,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        status: {
          hasStarted,
          hasEnded,
        },
      };

      // Cache the leaderboard (only cache page 1)
      if (page === 1 && limit === 50) {
        await redisHelpers.cacheLeaderboard(challengeId, responseData);
      }

      return NextResponse.json(responseData);
    } else {
      // Return empty leaderboard if challenge hasn't started
      return NextResponse.json({
        leaderboard: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
        status: {
          hasStarted: false,
          hasEnded: false,
          message: "Leaderboard will be available once the challenge begins.",
        },
      });
    }
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { message: "Error fetching leaderboard", error: error.message },
      { status: 500 },
    );
  }
}
