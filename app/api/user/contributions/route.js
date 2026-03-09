import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";

// GET handler for fetching user contribution data
export async function GET(request) {
  try {
    // Get the search params from the request URL
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // If userId is not provided, use the current user's ID
    const targetUserId = userId || session.user.id;

    // Get the contribution data for the past year
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    // Use groupBy to aggregate at the DB level instead of fetching all rows
    const dailyCounts = await prisma.$queryRawUnsafe(
      `SELECT DATE("submittedAt") as date, COUNT(*)::int as count
       FROM "Submission"
       WHERE "userId" = $1 AND "submittedAt" >= $2
       GROUP BY DATE("submittedAt")
       ORDER BY date ASC`,
      targetUserId,
      oneYearAgo,
    );

    // Convert to array format expected by the frontend
    const contributionData = dailyCounts.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      count: Math.min(Number(row.count), 4),
    }));

    const response = NextResponse.json({
      success: true,
      contributionData,
    });
    response.headers.set(
      "Cache-Control",
      "private, max-age=300, stale-while-revalidate=600",
    );
    return response;
  } catch (error) {
    console.error("Error fetching contribution data:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching contribution data" },
      { status: 500 },
    );
  }
}
