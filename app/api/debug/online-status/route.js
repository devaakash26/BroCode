import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redisHelpers } from "@/lib/redis";

/**
 * Debug endpoint to check online user tracking status
 * GET /api/debug/online-status
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      currentUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      sources: {},
      summary: {
        socketServerAvailable: false,
        redisAvailable: false,
        totalOnlineUsers: 0,
      },
    };

    // Check Socket.io server
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_SERVER_URL;

    if (socketUrl) {
      try {
        const socketApiUrl = socketUrl.replace(/\/$/, "") + "/api/online-users";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(socketApiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          results.sources.socketServer = {
            available: true,
            url: socketApiUrl,
            userCount: data.count || 0,
            connectedSockets: data.connectedSockets || 0,
            memorySize: data.memorySize || 0,
            users: data.users || [],
            currentUserOnline: data.users?.some(
              (u) => u.userId === session.user.id || u.id === session.user.id,
            ),
          };
          results.summary.socketServerAvailable = true;
          results.summary.totalOnlineUsers = data.count || 0;
        } else {
          results.sources.socketServer = {
            available: false,
            error: `HTTP ${response.status}`,
            url: socketApiUrl,
          };
        }
      } catch (error) {
        results.sources.socketServer = {
          available: false,
          error: error.name === "AbortError" ? "Timeout" : error.message,
          url: socketUrl,
        };
      }
    } else {
      results.sources.socketServer = {
        available: false,
        error: "Socket server URL not configured",
      };
    }

    // Check Redis
    try {
      const onlineUserIds = await redisHelpers.getOnlineUserIds();
      results.sources.redis = {
        available: true,
        userCount: onlineUserIds.length,
        userIds: onlineUserIds,
        currentUserOnline: onlineUserIds.includes(session.user.id),
      };
      results.summary.redisAvailable = true;

      // If socket server wasn't available, use Redis count
      if (!results.summary.socketServerAvailable) {
        results.summary.totalOnlineUsers = onlineUserIds.length;
      }
    } catch (error) {
      results.sources.redis = {
        available: false,
        error: error.message,
      };
    }

    // Add recommendations
    results.recommendations = [];

    if (!results.summary.socketServerAvailable) {
      results.recommendations.push(
        "Socket server is not reachable. Check NEXT_PUBLIC_SOCKET_URL environment variable.",
      );
    }

    if (!results.summary.redisAvailable) {
      results.recommendations.push(
        "Redis is not available. Online user tracking may be unreliable.",
      );
    }

    const currentUserOnlineInSocket =
      results.sources.socketServer?.currentUserOnline;
    const currentUserOnlineInRedis = results.sources.redis?.currentUserOnline;

    if (!currentUserOnlineInSocket && !currentUserOnlineInRedis) {
      results.recommendations.push(
        "Current user is not tracked as online in any source. Check socket connection and identify event.",
      );
    } else if (!currentUserOnlineInSocket && currentUserOnlineInRedis) {
      results.recommendations.push(
        "Current user is in Redis but not in socket server. Socket server may have restarted recently.",
      );
    } else if (currentUserOnlineInSocket && !currentUserOnlineInRedis) {
      results.recommendations.push(
        "Current user is in socket server but not in Redis. Redis connection may be down.",
      );
    } else {
      results.recommendations.push(
        "Current user is properly tracked as online in all available sources.",
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[debug/online-status] Error:", error);
    return NextResponse.json(
      { error: "Failed to check online status", message: error.message },
      { status: 500 },
    );
  }
}
