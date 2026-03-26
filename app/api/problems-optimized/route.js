import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

/**
 * Optimized Problems Listing API with advanced filtering
 * GET /api/problems-optimized
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - difficulty: EASY | MEDIUM | HARD
 * - tags: comma-separated tag slugs
 * - search: string (searches title, description)
 * - featured: boolean
 * - solved: boolean (requires authentication)
 * - sortBy: title | difficulty | acceptance | recent (default: recent)
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit")) || 20),
    );
    const skip = (page - 1) * limit;

    // Parse filters
    const difficulty = searchParams.get("difficulty");
    const tagSlugs = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const search = searchParams.get("search");
    const featured = searchParams.get("featured") === "true";
    const solved = searchParams.get("solved") === "true";
    const sortBy = searchParams.get("sortBy") || "recent";

    // Build where clause
    const where = {
      isPublic: true,
      isReadyToSolve: true,
    };

    // Admin can see all problems
    if (session?.user?.role === "PLATFORM_ADMIN") {
      delete where.isPublic;
      delete where.isReadyToSolve;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (featured) {
      where.isFeatured = true;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by tags
    if (tagSlugs.length > 0) {
      where.tagMappings = {
        some: {
          tag: {
            slug: {
              in: tagSlugs,
            },
          },
        },
      };
    }

    // Filter by solved status
    if (solved && session?.user) {
      where.submissions = {
        some: {
          userId: session.user.id,
          status: "ACCEPTED",
        },
      };
    }

    // Build orderBy clause
    let orderBy = {};
    switch (sortBy) {
      case "title":
        orderBy = { title: "asc" };
        break;
      case "difficulty":
        orderBy = { difficulty: "asc" };
        break;
      case "acceptance":
        // Sort by acceptance rate (acceptedCount / submitCount)
        orderBy = { acceptedCount: "desc" };
        break;
      case "popular":
        orderBy = { viewCount: "desc" };
        break;
      case "recent":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // Fetch problems with optimized includes
    const [problems, totalCount] = await Promise.all([
      prisma.problem.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          isFeatured: true,
          viewCount: true,
          submitCount: true,
          acceptedCount: true,
          createdAt: true,
          tagMappings: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  color: true,
                },
              },
            },
          },
          _count: {
            select: {
              submissions: session?.user
                ? {
                    where: {
                      userId: session.user.id,
                      status: "ACCEPTED",
                    },
                  }
                : undefined,
            },
          },
        },
      }),
      prisma.problem.count({ where }),
    ]);

    // Calculate acceptance rate and format response
    const formattedProblems = problems.map((problem) => {
      const acceptanceRate =
        problem.submitCount > 0
          ? ((problem.acceptedCount / problem.submitCount) * 100).toFixed(1)
          : 0;

      return {
        id: problem.id,
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
        isFeatured: problem.isFeatured,
        viewCount: problem.viewCount,
        acceptanceRate: parseFloat(acceptanceRate),
        tags: problem.tagMappings.map((mapping) => mapping.tag),
        isSolved: session?.user ? problem._count.submissions > 0 : false,
        createdAt: problem.createdAt,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      problems: formattedProblems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        difficulty,
        tags: tagSlugs,
        search,
        featured,
        solved,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Error fetching problems:", error);
    return NextResponse.json(
      { error: "Failed to fetch problems", details: error.message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/problems-optimized/stats - Get problem statistics
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    // Aggregate statistics
    const [
      totalProblems,
      easyCount,
      mediumCount,
      hardCount,
      featuredCount,
      solvedCount,
      totalSubmissions,
      tagStats,
    ] = await Promise.all([
      prisma.problem.count({ where: { isPublic: true, isReadyToSolve: true } }),
      prisma.problem.count({
        where: { difficulty: "EASY", isPublic: true, isReadyToSolve: true },
      }),
      prisma.problem.count({
        where: { difficulty: "MEDIUM", isPublic: true, isReadyToSolve: true },
      }),
      prisma.problem.count({
        where: { difficulty: "HARD", isPublic: true, isReadyToSolve: true },
      }),
      prisma.problem.count({
        where: { isFeatured: true, isPublic: true, isReadyToSolve: true },
      }),

      // User-specific stats
      session?.user
        ? prisma.problem.count({
            where: {
              isPublic: true,
              isReadyToSolve: true,
              submissions: {
                some: {
                  userId: session.user.id,
                  status: "ACCEPTED",
                },
              },
            },
          })
        : 0,

      session?.user
        ? prisma.submission.count({ where: { userId: session.user.id } })
        : 0,

      // Tag statistics
      prisma.tag.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
          _count: {
            select: { problems: true },
          },
        },
        orderBy: {
          problems: {
            _count: "desc",
          },
        },
        take: 20, // Top 20 tags
      }),
    ]);

    return NextResponse.json({
      total: totalProblems,
      byDifficulty: {
        EASY: easyCount,
        MEDIUM: mediumCount,
        HARD: hardCount,
      },
      featured: featuredCount,
      userStats: session?.user
        ? {
            solved: solvedCount,
            totalSubmissions,
            solveRate:
              totalProblems > 0
                ? ((solvedCount / totalProblems) * 100).toFixed(1)
                : 0,
          }
        : null,
      topTags: tagStats.map((tag) => ({
        ...tag,
        problemCount: tag._count.problems,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error("Error fetching problem stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 },
    );
  }
}
