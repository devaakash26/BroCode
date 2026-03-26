import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

/**
 * POST /api/problems/[id]/tags - Assign tags to a problem
 * Body: { tagIds: string[] }
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can manage problem tags
    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: problemId } = params;
    const { tagIds } = await request.json();

    if (!Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: "tagIds must be an array" },
        { status: 400 },
      );
    }

    // Verify problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // Remove existing mappings
    await prisma.codingQuestionTagMapping.deleteMany({
      where: { problemId },
    });

    // Create new mappings
    if (tagIds.length > 0) {
      await prisma.codingQuestionTagMapping.createMany({
        data: tagIds.map((tagId) => ({
          problemId,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // Fetch updated problem with tags
    const updatedProblem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        tagMappings: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      tags: updatedProblem.tagMappings.map((mapping) => mapping.tag),
    });
  } catch (error) {
    console.error("Error assigning tags:", error);
    return NextResponse.json(
      { error: "Failed to assign tags" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/problems/[id]/tags - Get problem tags
 */
export async function GET(request, { params }) {
  try {
    const { id: problemId } = params;

    const mappings = await prisma.codingQuestionTagMapping.findMany({
      where: { problemId },
      include: {
        tag: true,
      },
    });

    return NextResponse.json(mappings.map((m) => m.tag));
  } catch (error) {
    console.error("Error fetching problem tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}
