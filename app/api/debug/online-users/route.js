import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import redis from "@/lib/redis";

// GET /api/debug/online-users - Debug endpoint to see all online users in Redis
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all online user keys
    const onlineUserKeys = await redis.keys("user:online:*");
    console.log("[debug/online-users] Found keys:", onlineUserKeys);

    // Get all user data
    const onlineUsers = [];
    for (const key of onlineUserKeys) {
      try {
        const userData = await redis.get(key);
        onlineUsers.push({
          key,
          data: userData,
        });
      } catch (error) {
        console.error("[debug/online-users] Error getting key:", key, error);
      }
    }

    return NextResponse.json({
      totalKeys: onlineUserKeys.length,
      keys: onlineUserKeys,
      users: onlineUsers,
      currentUserId: session.user.id,
    });
  } catch (error) {
    console.error("[debug/online-users] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch online users",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
