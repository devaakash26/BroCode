import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

/**
 * PATCH /api/problems/[id]/visibility - Update problem visibility
 * Body: { isPublic: boolean, isReadyToSolve?: boolean, isFeatured?: boolean }
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can manage problem visibility
    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: problemId } = params;
    const body = await request.json();
    const { isPublic, isReadyToSolve, isFeatured } = body;

    const updateData = {};
    if (typeof isPublic === "boolean") updateData.isPublic = isPublic;
    if (typeof isReadyToSolve === "boolean")
      updateData.isReadyToSolve = isReadyToSolve;
    if (typeof isFeatured === "boolean") updateData.isFeatured = isFeatured;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const problem = await prisma.problem.update({
      where: { id: problemId },
      data: { ...updateData, updatedAt: new Date() },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublic: true,
        isReadyToSolve: true,
        isFeatured: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      problem,
      message: "Problem visibility updated successfully",
    });
  } catch (error) {
    console.error("Error updating problem visibility:", error);
    return NextResponse.json(
      { error: "Failed to update problem visibility" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/problems/[id]/visibility - Get problem visibility status
 */
export async function GET(request, { params }) {
  try {
    const { id: problemId } = params;

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublic: true,
        isReadyToSolve: true,
        isFeatured: true,
        isCustom: true,
        groupId: true,
      },
    });

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    return NextResponse.json(problem);
  } catch (error) {
    console.error("Error fetching problem visibility:", error);
    return NextResponse.json(
      { error: "Failed to fetch problem visibility" },
      { status: 500 },
    );
  }
}
