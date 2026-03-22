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

    // Method 1: Query Socket.io server directly (most reliable - gets actual connected sockets)
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_SERVER_URL;
    if (socketUrl) {
      try {
        const socketApiUrl = socketUrl.replace(/\/$/, "") + "/api/online-users";
        console.log("[online-users] Querying socket server:", socketApiUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(socketApiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.users)) {
            onlineUserIds = data.users.map((u) => u.userId || u.id);
            dataSource = "socket-server";
            console.log(
              `[online-users] Socket server returned ${onlineUserIds.length} users from ${data.connectedSockets} connected sockets`,
            );
          }
        } else {
          console.warn(
            `[online-users] Socket server returned ${response.status}`,
          );
        }
      } catch (error) {
        if (error.name === "AbortError") {
          console.warn("[online-users] Socket server request timed out");
        } else {
          console.error(
            "[online-users] Socket server fetch error:",
            error.message,
          );
        }
      }
    } else {
      console.warn("[online-users] No socket server URL configured");
    }

    // Method 2: Fallback to Redis if socket server failed or returned no users
    if (onlineUserIds.length === 0) {
      console.log("[online-users] Falling back to Redis...");
      try {
        const redisIds = await redisHelpers.getOnlineUserIds();
        if (redisIds && redisIds.length > 0) {
          onlineUserIds = redisIds;
          dataSource = "redis";
          console.log(
            "[online-users] Redis returned",
            onlineUserIds.length,
            "users",
          );
        }
      } catch (error) {
        console.error("[online-users] Redis error:", error);
      }
    }

    // Method 3: Final fallback - get recently active users from database (last 10 minutes)
    if (onlineUserIds.length === 0) {
      console.log(
        "[online-users] Falling back to database (recent activity)...",
      );
      try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentUsers = await prisma.user.findMany({
          where: {
            lastSeen: {
              gte: tenMinutesAgo,
            },
            id: {
              notIn: memberIds, // exclude current group members
            },
            NOT: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ],
          },
          select: { id: true },
          take: 50,
        });
        onlineUserIds = recentUsers.map((u) => u.id);
        dataSource = "database-recent";
        console.log(
          "[online-users] Database returned",
          onlineUserIds.length,
          "recently active users",
        );
      } catch (error) {
        console.error("[online-users] Database fallback error:", error);
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
      "| Invitable (after filter):",
      invitableUserIds.length,
      "| Timestamp:",
      new Date().toISOString(),
    );

    if (invitableUserIds.length === 0) {
      return NextResponse.json({
        users: [],
        source: dataSource,
        message:
          dataSource === "none"
            ? "No online users found across all sources"
            : "No invitable users found",
      });
    }

    // Fetch user details
    const users = await prisma.user.findMany({
      where: {
        id: { in: invitableUserIds },
        NOT: [
          { name: { contains: 'test', mode: 'insensitive' } },
          { email: { contains: 'test', mode: 'insensitive' } },
        ],
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

    console.log(
      `[online-users] Returning ${users.length} user details to client`,
    );

    return NextResponse.json({
      users,
      source: dataSource,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[online-users] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch online users", message: error.message },
      { status: 500 },
    );
  }
}
