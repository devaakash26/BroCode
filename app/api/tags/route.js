import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

/**
 * GET /api/tags - Get all tags
 * Query params: ?search=string&limit=number
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit")) || 100;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const tags = await prisma.tag.findMany({
      where,
      take: limit,
      include: {
        _count: {
          select: { problems: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tags - Create a new tag
 * Body: { name: string, color?: string }
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can create tags
    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, color } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 },
      );
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const tag = await prisma.tag.create({
      data: {
        name,
        slug,
        color: color || "#3B82F6",
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Tag with this name or slug already exists" },
        { status: 409 },
      );
    }
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/tags/[id] - Update tag
 * Body: { name?: string, color?: string }
 */
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { name, color } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Tag ID is required" },
        { status: 400 },
      );
    }

    const updateData = {};
    if (name) {
      updateData.name = name;
      updateData.slug = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }
    if (color !== undefined) updateData.color = color;

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tags/[id] - Delete tag
 */
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Tag ID is required" },
        { status: 400 },
      );
    }

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 },
    );
  }
}
