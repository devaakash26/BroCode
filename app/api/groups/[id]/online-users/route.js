import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/app/lib/db";
import { redisHelpers } from "@/lib/redis";

// GET /api/groups/[id]/online-users - Get online users (excluding current group members)
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = params;

    // Check if user is member or admin of the group
    const userGroup = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!userGroup) {
      return NextResponse.json(
        { error: "Not a group member" },
        { status: 403 },
      );
    }

    // Get current group members
    const groupMembers = await prisma.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const memberIds = groupMembers.map((m) => m.userId);

    // Get online users from Redis
    let onlineUserIds = [];
    try {
      onlineUserIds = await redisHelpers.getOnlineUserIds();
      console.log("[online-users] Total online users:", onlineUserIds.length);
    } catch (error) {
      console.error("[online-users] Redis error:", error);
      // Continue with empty array if Redis fails
    }

    // Filter out current group members and current user
    const invitableUserIds = onlineUserIds.filter(
      (id) => id !== session.user.id && !memberIds.includes(id),
    );

    console.log(
      "[online-users] Group members:",
      memberIds.length,
      "Online:",
      onlineUserIds.length,
      "Invitable:",
      invitableUserIds.length,
    );

    if (invitableUserIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Fetch user details
    const users = await prisma.user.findMany({
      where: {
        id: { in: invitableUserIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        lastSeen: true,
      },
      take: 50, // Limit to 50 users
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[online-users] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch online users" },
      { status: 500 },
    );
  }
}
