import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/app/lib/db";
import { redisHelpers } from "@/lib/redis";

// Module-level fallback cache when Redis is unavailable
const _groupCache = new Map();
const CACHE_TTL = 30_000; // 30 seconds

async function getGroupCached(id) {
  // Try Redis first
  const redisData = await redisHelpers.getGroup(id);
  if (redisData) return redisData;

  // Fallback to in-memory cache
  const hit = _groupCache.get(id);
  if (hit && Date.now() - hit.cachedAt < CACHE_TTL) return hit.data;

  const data = await prisma.group.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      inviteCode: true,
      inviteLink: true,
      isActive: true,
      visibility: true,
      memberLimit: true,
      image: true,
      createdAt: true,
      creatorId: true,
      _count: { select: { members: true } },
      creator: { select: { id: true, name: true, image: true } },
      members: {
        select: {
          userId: true,
          role: true,
          score: true,
          solvedCount: true,
          joinedAt: true,
          lastActive: true,
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { score: "desc" },
        take: 20,
      },
      challenges: {
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          isActive: true,
        },
        orderBy: { startTime: "desc" },
        take: 10,
      },
    },
  });

  // Cache in both Redis and in-memory for redundancy
  if (data) {
    await redisHelpers.cacheGroup(id, data);
    _groupCache.set(id, { data, cachedAt: Date.now() });
  }
  return data;
}

// Exported so mutation endpoints (PATCH/DELETE) can invalidate the cache.
export async function invalidateGroupCache(id) {
  await redisHelpers.invalidateGroup(id);
  _groupCache.delete(id);
}

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // getServerSession with JWT strategy is a pure JWT decode — no DB call, ~5 ms.
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Cached group data (heavy) + tiny membership point-lookup run in parallel.
    const [group, membership] = await Promise.all([
      getGroupCached(id),
      prisma.userGroup.findUnique({
        where: { userId_groupId: { userId: session.user.id, groupId: id } },
        select: { role: true },
      }),
    ]);

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    const userRole = membership?.role ?? null;
    const isAdmin = userRole === "ADMIN" || userRole === "CREATOR";
    const isMember = !!userRole;

    return NextResponse.json({
      success: true,
      group,
      isAdmin,
      isMember,
      userRole: userRole || null,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      {
        message: "Error fetching group details",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get the updated data from the request
    const data = await request.json();
    const { name, description, visibility, memberLimit } = data;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { message: "Group name cannot be empty" },
        { status: 400 },
      );
    }

    const VALID_VISIBILITY = ["PUBLIC", "PRIVATE", "UNLISTED"];
    if (visibility && !VALID_VISIBILITY.includes(visibility)) {
      return NextResponse.json(
        { message: "Invalid visibility value" },
        { status: 400 },
      );
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Check if the user is an admin or creator
    const isCreator = group.creatorId === session.user.id;
    const isAdmin =
      isCreator ||
      (group.members.length > 0 && group.members[0].role === "ADMIN");

    if (!isAdmin && !isCreator) {
      return NextResponse.json(
        { message: "You do not have permission to update this group" },
        { status: 403 },
      );
    }

    // Update the group
    const updateData = { name, description };
    if (visibility) updateData.visibility = visibility;
    if (memberLimit !== undefined)
      updateData.memberLimit =
        memberLimit === null ? null : Number(memberLimit);

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: updateData,
    });

    // Invalidate group cache after update
    await invalidateGroupCache(id);

    return NextResponse.json({
      group: updatedGroup,
      message: "Group updated successfully",
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { message: "Error updating group details" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    // Check if the user is the creator or an admin
    const isCreator = group.creatorId === session.user.id;
    const isAdmin =
      group.members.length > 0 && group.members[0].role === "ADMIN";

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { message: "Only the group creator or admins can delete this group" },
        { status: 403 },
      );
    }

    // Delete related data first (cascade delete might not work depending on your schema)
    // Delete memberships
    await prisma.userGroup.deleteMany({
      where: { groupId: id },
    });

    // Delete the group
    await prisma.group.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { message: "Error deleting group" },
      { status: 500 },
    );
  }
}
