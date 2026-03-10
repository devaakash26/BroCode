import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { redisHelpers } from "@/lib/redis";

export async function GET(request) {
  console.log("[Problems API] ===== REQUEST RECEIVED =====");
  try {
    const session = await getServerSession(authOptions);
    console.log("[Problems API] Session retrieved:", session?.user?.id);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;
    const difficulty = searchParams.get("difficulty");
    const tag = searchParams.get("tag");
    const status = searchParams.get("status"); // 'solved', 'unsolved', 'all'
    const search = searchParams.get("search") || "";

    // Build the where clause
    const where = {
      isPublic: true,
    };

    // Add difficulty filter
    if (
      difficulty &&
      ["EASY", "MEDIUM", "HARD"].includes(difficulty.toUpperCase())
    ) {
      where.difficulty = difficulty.toUpperCase();
    }

    // Add tag filter (using array contains)
    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    // Add title search
    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Create cache key from filters
    const filters = { difficulty, tag, status, search, page, limit };

    // Check if we're fetching all problems (no filters)
    const isFullList =
      !difficulty && !tag && !status && !search && page === 1 && limit >= 1000;

    // Try cache for full list first if applicable
    console.log(
      `[Problems API] isFullList: ${isFullList}, filters:`,
      JSON.stringify(filters),
    );
    if (isFullList) {
      console.log("[Problems API] Checking cache for full list...");
      const cachedAll = await redisHelpers.getAllProblems();
      console.log(
        "[Problems API] Full list cache result:",
        cachedAll ? "HIT" : "MISS",
      );
      if (cachedAll) {
        console.log("[Problems API] Returning cached full list");
        return NextResponse.json(cachedAll);
      }
    }

    // Try filtered cache
    console.log("[Problems API] Checking cache for filtered list...");
    const cachedResult = await redisHelpers.getProblemsList(filters);
    console.log(
      "[Problems API] Filtered list cache result:",
      cachedResult ? "HIT" : "MISS",
    );
    if (cachedResult) {
      console.log("[Problems API] Returning cached filtered list");
      return NextResponse.json(cachedResult);
    }

    console.log("[Problems API] No cache found, querying database...");

    // Query problems
    const problems = await prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        difficulty: true,
        tags: true,
        submissions: status
          ? {
              where: {
                userId: session.user.id,
                status: "ACCEPTED",
              },
              take: 1,
            }
          : undefined,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Format problems with solved status
    const formattedProblems = problems.map((problem) => ({
      ...problem,
      solved: problem.submissions?.length > 0 || false,
    }));

    // Filter by status if specified
    let filteredProblems = formattedProblems;
    if (status === "solved") {
      filteredProblems = formattedProblems.filter((p) => p.solved);
    } else if (status === "unsolved") {
      filteredProblems = formattedProblems.filter((p) => !p.solved);
    }

    // Get total count for pagination
    const totalCount = await prisma.problem.count({
      where,
    });

    const responseData = {
      problems: filteredProblems,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    // Cache the result
    console.log(
      `[Problems API] Attempting to cache result. isFullList: ${isFullList}`,
    );
    try {
      if (isFullList) {
        console.log("[Problems API] Caching full list...");
        await redisHelpers.cacheAllProblems(responseData);
        console.log("[Problems API] Full list cached successfully");
      } else {
        console.log(
          "[Problems API] Caching filtered list with filters:",
          filters,
        );
        await redisHelpers.cacheProblemsList(filters, responseData);
        console.log("[Problems API] Filtered list cached successfully");
      }
    } catch (cacheError) {
      console.error("[Problems API] Cache error:", cacheError);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching problems:", error);
    return NextResponse.json(
      { message: "Error fetching problems", error: error.message },
      { status: 500 },
    );
  }
}
