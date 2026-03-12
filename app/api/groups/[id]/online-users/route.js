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

    // Get online users - try Socket server first, then Redis fallback
    let onlineUserIds = [];
    let dataSource = "none";

    // Method 1: Query Socket.io server directly (most reliable)
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_SERVER_URL;
    if (socketUrl) {
      try {
        const socketApiUrl = socketUrl.replace(/\/$/, "") + "/api/online-users";
        console.log("[online-users] Querying socket server:", socketApiUrl);

        const response = await fetch(socketApiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.users)) {
            onlineUserIds = data.users.map((u) => u.userId || u.id);
            dataSource = "socket-server";
            console.log(
              `[online-users] Socket server returned ${onlineUserIds.length} users`,
            );
          }
        } else {
          console.warn(
            `[online-users] Socket server returned ${response.status}`,
          );
        }
      } catch (error) {
        console.error(
          "[online-users] Socket server fetch error:",
          error.message,
        );
      }
    }

    // Method 2: Fallback to Redis if socket server failed
    if (onlineUserIds.length === 0) {
      try {
        onlineUserIds = await redisHelpers.getOnlineUserIds();
        dataSource = "redis";
        console.log(
          "[online-users] Redis returned",
          onlineUserIds.length,
          "users",
        );
      } catch (error) {
        console.error("[online-users] Redis error:", error);
      }
    }

    // Filter out current group members and current user
    const invitableUserIds = onlineUserIds.filter(
      (id) => id !== session.user.id && !memberIds.includes(id),
    );

    console.log(
      "[online-users] Source:",
      dataSource,
      "| Group members:",
      memberIds.length,
      "| Online:",
      onlineUserIds.length,
      "| Invitable:",
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
