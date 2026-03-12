/**
 * Standalone Socket.io server
 * Deploy this separately on Railway / Render / Fly.io
 * Your Next.js app on Vercel connects to this via NEXT_PUBLIC_SOCKET_URL
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");

const port = parseInt(process.env.PORT || "4000", 10);

// ── Prisma client for persisting messages ───────────────────────────────────────
const prisma = new PrismaClient({ log: ["error"] });

// ── Redis client for online user tracking ───────────────────────────────────────
const REDIS_PROVIDER = process.env.REDIS_PROVIDER || "railway";
let redis = null;
let redisPub = null; // For Socket.io adapter
let redisSub = null; // For Socket.io adapter
let redisReady = false;

// In-memory fallback for online users (when Redis is unavailable)
const inMemoryOnlineUsers = new Map(); // userId → { userData, timestamp }

console.log(`[socket-server] 🔍 Checking Redis configuration...`);
console.log(`[socket-server] REDIS_PROVIDER: ${REDIS_PROVIDER}`);

// Initialize Redis based on provider
if (REDIS_PROVIDER === "railway") {
  const redisUrl = process.env.RAILWAY_REDIS_URL;
  console.log(`[socket-server] RAILWAY_REDIS_URL exists: ${!!redisUrl}`);

  if (redisUrl && !redisUrl.includes("[YOUR_RAILWAY_HOST]")) {
    console.log("[socket-server] 🔧 Initializing Redis connections...");

    // Main Redis client for online tracking
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(
          `[socket-server] Redis retry attempt ${times}, waiting ${delay}ms`,
        );
        return delay;
      },
      lazyConnect: false,
      enableOfflineQueue: true,
      reconnectOnError: (err) => {
        console.error(
          `[socket-server] Redis reconnect on error: ${err.message}`,
        );
        return true;
      },
    });

    // Pub/Sub clients for Socket.io adapter (multi-instance support)
    redisPub = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
    redisSub = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    redis.on("error", (err) => {
      console.error("[socket-server] ❌ Redis error:", err.message);
      redisReady = false;
    });

    redis.on("connect", () => {
      console.log("[socket-server] 🔄 Redis connecting...");
    });

    redis.on("ready", async () => {
      console.log("[socket-server] ✅ Redis ready - online tracking enabled");
      redisReady = true;

      // Sync in-memory users to Redis when connection is restored
      if (inMemoryOnlineUsers.size > 0) {
        console.log(
          `[socket-server] 📤 Syncing ${inMemoryOnlineUsers.size} users to Redis...`,
        );
        await syncInMemoryToRedis();
      }
    });

    redis.on("close", () => {
      console.warn("[socket-server] ⚠️  Redis connection closed");
      redisReady = false;
    });

    redis.on("reconnecting", () => {
      console.log("[socket-server] 🔄 Redis reconnecting...");
    });

    redisPub.on("error", (err) =>
      console.error("[socket-server] Redis Pub error:", err.message),
    );
    redisSub.on("error", (err) =>
      console.error("[socket-server] Redis Sub error:", err.message),
    );
  } else {
    console.warn("[socket-server] Railway Redis URL not configured");
  }
} else if (REDIS_PROVIDER === "upstash") {
  console.warn(
    "[socket-server] Upstash Redis not supported in socket server (use Railway for socket features)",
  );
} else {
  console.warn(
    "[socket-server] No Redis provider configured - online tracking disabled",
  );
}

// ── Helper Functions ─────────────────────────────────────────────────────────────

// Sync in-memory online users to Redis when connection is restored
async function syncInMemoryToRedis() {
  if (!redis || !redisReady) return;

  let synced = 0;
  for (const [userId, data] of inMemoryOnlineUsers.entries()) {
    try {
      await redis.setex(
        `user:online:${userId}`,
        1800, // 30 minutes
        JSON.stringify(data.userData),
      );
      synced++;
    } catch (err) {
      console.error(
        `[socket-server] Failed to sync user ${userId} to Redis:`,
        err.message,
      );
    }
  }
  console.log(
    `[socket-server] ✅ Synced ${synced}/${inMemoryOnlineUsers.size} users to Redis`,
  );
}

// Track user as online in both memory and Redis (fault-proof)
async function trackUserOnline(userId, userData) {
  // Always store in memory first with timestamp
  inMemoryOnlineUsers.set(userId, {
    userData,
    timestamp: Date.now(),
  });

  // Try to store in Redis if available
  let trackedInRedis = false;
  if (redis && redisReady) {
    try {
      await redis.setex(
        `user:online:${userId}`,
        1800, // 30 minutes
        JSON.stringify(userData),
      );
      trackedInRedis = true;
      console.log(`[socket-server] ✓ Tracked user ${userId} in Redis`);
    } catch (err) {
      console.error(
        `[socket-server] Redis setex error for user ${userId}:`,
        err.message,
      );
    }
  }

  if (!trackedInRedis) {
    console.log(`[socket-server] ✓ Stored user ${userId} in memory (fallback)`);
  }

  return trackedInRedis;
}

// Remove user from online tracking in both memory and Redis
async function trackUserOffline(userId) {
  // Remove from memory
  inMemoryOnlineUsers.delete(userId);

  // Remove from Redis if available
  if (redis && redisReady) {
    try {
      await redis.del(`user:online:${userId}`);
      console.log(`[socket-server] ✓ Removed user ${userId} from Redis`);
    } catch (err) {
      console.error(
        `[socket-server] Redis del error for user ${userId}:`,
        err.message,
      );
    }
  }

  console.log(`[socket-server] ✓ User ${userId} removed from online tracking`);
}

// Refresh user's online status (called by heartbeat)
async function refreshUserOnline(userId) {
  const userData = inMemoryOnlineUsers.get(userId);
  if (!userData) return false;

  // Update timestamp in memory
  userData.timestamp = Date.now();

  // Refresh TTL in Redis
  if (redis && redisReady) {
    try {
      await redis.expire(`user:online:${userId}`, 1800);
      return true;
    } catch (err) {
      console.error(
        `[socket-server] Refresh TTL error for ${userId}:`,
        err.message,
      );
    }
  }
  return false;
}

// Get all online users from actual socket connections (most accurate)
function getOnlineUsersFromSockets() {
  const onlineUsers = [];
  const now = Date.now();

  // Iterate through all connected sockets
  for (const [userId, data] of socketConnections.entries()) {
    const socket = io.sockets.sockets.get(data.socketId);
    if (socket && socket.connected) {
      // User has active connection
      const memoryData = inMemoryOnlineUsers.get(userId);
      onlineUsers.push({
        userId,
        ...data.userData,
        socketId: data.socketId,
        connected: true,
        lastSeen: memoryData
          ? new Date(memoryData.timestamp).toISOString()
          : new Date().toISOString(),
      });
    }
  }

  // Also include users from memory who might have connections
  for (const [userId, data] of inMemoryOnlineUsers.entries()) {
    const timeSinceActive = now - data.timestamp;
    // Include if active within last 5 minutes and not already added
    if (
      timeSinceActive < 300000 &&
      !onlineUsers.find((u) => u.userId === userId)
    ) {
      onlineUsers.push({
        userId,
        ...data.userData,
        connected: false,
        lastSeen: new Date(data.timestamp).toISOString(),
      });
    }
  }

  return onlineUsers;
}

// ── Maintenance Intervals ────────────────────────────────────────────────────────

// Heartbeat: Refresh Redis TTL for all online users every 5 minutes
setInterval(async () => {
  if (inMemoryOnlineUsers.size === 0) return;

  console.log(
    `[socket-server] 💓 Heartbeat: Refreshing TTL for ${inMemoryOnlineUsers.size} online users...`,
  );
  let refreshedRedis = 0;
  let activeConnections = 0;

  for (const [userId, data] of inMemoryOnlineUsers.entries()) {
    // Check if user has active socket connection
    const conn = socketConnections.get(userId);
    if (conn) {
      const socket = io.sockets.sockets.get(conn.socketId);
      if (socket && socket.connected) {
        activeConnections++;
        // Update timestamp for active connections
        data.timestamp = Date.now();
      }
    }

    // Refresh Redis TTL
    if (redis && redisReady) {
      try {
        await redis.expire(`user:online:${userId}`, 1800); // Reset to 30 minutes
        refreshedRedis++;
      } catch (err) {
        console.error(
          `[socket-server] Heartbeat error for user ${userId}:`,
          err.message,
        );
      }
    }
  }

  console.log(
    `[socket-server] 💓 Heartbeat complete: ${activeConnections} active, ${refreshedRedis} refreshed in Redis`,
  );
}, 300_000); // 5 minutes

// Cleanup: Remove stale entries from memory every 5 minutes
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 35 * 60 * 1000; // 35 minutes (older than Redis TTL)
  let removed = 0;

  for (const [userId, data] of inMemoryOnlineUsers.entries()) {
    if (now - data.timestamp > staleThreshold) {
      inMemoryOnlineUsers.delete(userId);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[socket-server] 🧹 Cleanup removed ${removed} stale entries`);
  }
}, 300_000); // 5 minutes

// ── CORS origins ────────────────────────────────────────────────────────────────
// Set ALLOWED_ORIGIN to your Vercel URL, e.g. https://brocode.vercel.app
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim());

const expressApp = express();
const server = http.createServer(expressApp);

// Global error handling
process.on("uncaughtException", (err) => {
  console.error("[socket-server] uncaughtException:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[socket-server] unhandledRejection:", reason);
});

// ── Socket.IO ────────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:
      allowedOrigins.length === 1 && allowedOrigins[0] === "*"
        ? "*"
        : allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  connectTimeout: 30000,
});

// ── Socket.IO Redis Adapter (for multi-instance support) ────────────────────────
if (redisPub && redisSub) {
  io.adapter(createAdapter(redisPub, redisSub));
  console.log(
    "[socket-server] ✅ Socket.IO Redis Adapter enabled (multi-instance support)",
  );
} else {
  console.warn(
    "[socket-server] ⚠️  Socket.IO Redis Adapter disabled (single instance mode)",
  );
}

// ── Connection tracking ──────────────────────────────────────────────────────────
const socketConnections = new Map(); // userId → { socketId, userData }
const groupRooms = new Map(); // groupId → Set<userId>
const challengeRooms = new Map(); // challengeId → Set<userId>
const socketToUser = new Map(); // socketId → userId  (O(1) reverse lookup)

// Periodic cleanup of empty rooms
setInterval(() => {
  for (const [id, members] of groupRooms.entries()) {
    if (members.size === 0) groupRooms.delete(id);
  }
  for (const [id, members] of challengeRooms.entries()) {
    if (members.size === 0) challengeRooms.delete(id);
  }
}, 300_000);

function findUser(socketId) {
  const userId = socketToUser.get(socketId);
  if (!userId) return { userId: null, userData: null };
  const data = socketConnections.get(userId);
  if (!data) return { userId: null, userData: null };
  return { userId, userData: data.userData };
}

// ── Socket event handlers ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("[socket] connected:", socket.id);

  socket.on("identify", async (userData) => {
    if (!userData?.id) {
      console.warn("[socket] identify called without user ID");
      return;
    }

    // Remove old reverse-map entry for this user if they had a previous socket
    const existing = socketConnections.get(userData.id);
    if (existing?.socketId && existing.socketId !== socket.id) {
      socketToUser.delete(existing.socketId);
      console.log(
        `[socket] Replaced old socket ${existing.socketId} for user ${userData.id}`,
      );
    }
    socketConnections.set(userData.id, { socketId: socket.id, userData });
    socketToUser.set(socket.id, userData.id);

    // Track online user with fault-proof mechanism
    const onlineData = {
      id: userData.id,
      name: userData.name,
      image: userData.image,
      email: userData.email,
      lastSeen: new Date().toISOString(),
    };

    const trackedInRedis = await trackUserOnline(userData.id, onlineData);

    // Confirm tracking to client
    socket.emit("identified", {
      success: true,
      userId: userData.id,
      trackedInRedis,
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[socket] ✓ User ${userData.id} (${userData.name}) identified on socket ${socket.id}`,
    );

    console.log(
      `[socket] identified: ${userData.id} (${userData.name}) socketId: ${socket.id}`,
    );
  });

  socket.on("joinGroup", (groupId) => {
    if (!groupId) return;
    const room = `group:${groupId}`;
    socket.join(room);

    if (!groupRooms.has(groupId)) groupRooms.set(groupId, new Set());

    const { userId, userData } = findUser(socket.id);
    if (!userId) return;

    groupRooms.get(groupId).add(userId);

    const memberPayload = {
      userId,
      userName: userData?.name || "Unknown",
      userImage: userData?.image || null,
      groupId,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to ALL in room including sender (fixes "0 online" bug)
    io.to(room).emit("memberActive", memberPayload);

    // Notify others that a new user joined (for toast)
    socket.to(room).emit("memberJoined", memberPayload);

    // Send existing online members back to the new joiner
    const onlineInGroup = [];
    for (const memberId of groupRooms.get(groupId)) {
      const conn = socketConnections.get(memberId);
      if (conn && memberId !== userId) {
        onlineInGroup.push({
          userId: memberId,
          userName: conn.userData?.name || "Unknown",
          userImage: conn.userData?.image || null,
          groupId,
          timestamp: new Date().toISOString(),
        });
      }
    }
    if (onlineInGroup.length > 0) {
      socket.emit("onlineMembersList", { groupId, members: onlineInGroup });
    }

    io.to(room).emit("memberCountUpdate", {
      groupId,
      count: groupRooms.get(groupId).size,
    });
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { groupId, content, challengeId, ephemeral } = data || {};
      if (!groupId || !content?.trim()) return;

      const { userId, userData } = findUser(socket.id);
      if (!userId) {
        console.warn(
          `[socket] sendMessage: findUser failed for ${socket.id} — user not identified`,
        );
        socket.emit("error", { message: "User not identified" });
        return;
      }

      const trimmedContent = content.trim();

      // Challenge ephemeral messages: broadcast only, no DB
      if (challengeId && ephemeral) {
        const msg = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          content: trimmedContent,
          sender: {
            id: userId,
            name: userData?.name || "Unknown",
            image: userData?.image || null,
          },
          sentAt: new Date().toISOString(),
        };
        // socket.to excludes sender; then echo back to sender separately
        socket.to(`challenge:${challengeId}`).emit("challengeMessage", msg);
        socket.emit("challengeMessage", msg);
        console.log(
          `[socket] challengeMessage → room challenge:${challengeId} from ${userId}`,
        );
        return;
      }

      // Save message to database
      let dbMessage;
      try {
        console.log(dbMessage);
        dbMessage = await prisma.chatMessage.create({
          data: {
            content: trimmedContent,
            senderId: userId,
            groupId,
          },
          select: { id: true, sentAt: true },
        });
      } catch (dbErr) {
        console.error("[socket] DB save message error:", dbErr);
        // Continue with in-memory ID as fallback so chat still works
      }

      const message = {
        id:
          dbMessage?.id ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        content: trimmedContent,
        groupId,
        senderId: userId,
        senderName: userData?.name || "Unknown",
        senderImage: userData?.image || null,
        sentAt: dbMessage?.sentAt?.toISOString() || new Date().toISOString(),
      };

      io.to(`group:${groupId}`).emit("newMessage", message);
    } catch (err) {
      console.error("[socket] sendMessage error:", err);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("typing", (data) => {
    const { groupId, isTyping } = data || {};
    if (!groupId) return;
    const { userId, userData } = findUser(socket.id);
    if (!userId) return;
    socket.to(`group:${groupId}`).emit("userTyping", {
      userId,
      userName: userData?.name || "Unknown",
      userImage: userData?.image || null,
      isTyping: !!isTyping,
      timestamp: new Date().toISOString(),
    });
  });

  // Challenge typing indicator
  socket.on("challengeTyping", (data) => {
    const { challengeId, isTyping } = data || {};
    if (!challengeId) return;
    const { userId, userData } = findUser(socket.id);
    if (!userId) return;
    socket.to(`challenge:${challengeId}`).emit("challengeUserTyping", {
      userId,
      userName: userData?.name || "Unknown",
      isTyping: !!isTyping,
    });
  });

  socket.on("heartbeat", async (data) => {
    try {
      const { groupId } = data || {};
      const { userId, userData } = findUser(socket.id);
      if (!userId) return;

      // Refresh online status
      await refreshUserOnline(userId);

      // Handle group-specific heartbeat
      if (groupId) {
        if (!groupRooms.has(groupId)) groupRooms.set(groupId, new Set());
        groupRooms.get(groupId).add(userId);

        const room = `group:${groupId}`;
        io.to(room).emit("memberActive", {
          userId,
          userName: userData?.name || "Unknown",
          userImage: userData?.image || null,
          groupId,
          timestamp: new Date().toISOString(),
        });

        io.to(room).emit("memberCountUpdate", {
          groupId,
          count: groupRooms.get(groupId).size,
        });
      }

      // Acknowledge heartbeat
      socket.emit("heartbeatAck", {
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[socket] heartbeat error:", err);
    }
  });

  // User online status ping (for maintaining online presence)
  socket.on("ping", async () => {
    const { userId } = findUser(socket.id);
    if (userId) {
      await refreshUserOnline(userId);
      socket.emit("pong", { timestamp: Date.now() });
    }
  });

  socket.on("joinChallenge", (challengeId) => {
    if (!challengeId) return;
    const room = `challenge:${challengeId}`;
    socket.join(room);
    console.log(`[socket] ${socket.id} joined ${room}`);
    if (!challengeRooms.has(challengeId))
      challengeRooms.set(challengeId, new Set());
    const { userId, userData } = findUser(socket.id);
    if (!userId) {
      console.warn(
        `[socket] joinChallenge: findUser failed for ${socket.id} — socket joined room but not tracked`,
      );
      return;
    }
    challengeRooms.get(challengeId).add(userId);
    socket.to(room).emit("participantJoined", {
      userId,
      userName: userData?.name || "Unknown",
      timestamp: new Date().toISOString(),
    });
    io.to(room).emit("participantCountUpdate", {
      challengeId,
      count: challengeRooms.get(challengeId).size,
    });
  });

  // ── Notification events ──────────────────────────────────────────────────────
  socket.on("sendNotification", async (data) => {
    try {
      const { recipientId, notification } = data || {};
      if (!recipientId || !notification) return;

      // Get recipient's socket connection
      const recipientConn = socketConnections.get(recipientId);
      if (recipientConn) {
        // Send notification to recipient's socket
        io.to(recipientConn.socketId).emit("newNotification", notification);
        console.log(`[socket] notification sent to user ${recipientId}`);
      } else {
        console.log(
          `[socket] user ${recipientId} not connected, notification stored in DB only`,
        );
      }
    } catch (error) {
      console.error("[socket] sendNotification error:", error);
    }
  });

  socket.on("markNotificationRead", async (data) => {
    try {
      const { notificationId } = data || {};
      const { userId } = findUser(socket.id);

      if (!userId || !notificationId) return;

      // Acknowledge the read status
      socket.emit("notificationMarkedRead", { notificationId });
    } catch (error) {
      console.error("[socket] markNotificationRead error:", error);
    }
  });

  // Track online users for invitation feature
  socket.on("setOnlineStatus", async (data) => {
    try {
      const { userId } = findUser(socket.id);
      if (!userId) return;

      // Broadcast online status to relevant users/groups
      // This is automatically handled by the identify event,
      // but we can add additional tracking here if needed
      console.log(`[socket] user ${userId} is online`);
    } catch (error) {
      console.error("[socket] setOnlineStatus error:", error);
    }
  });

  socket.on("disconnect", async (reason) => {
    console.log(`[socket] disconnected: ${socket.id} - Reason: ${reason}`);
    const { userId } = findUser(socket.id);
    socketToUser.delete(socket.id);
    if (!userId) return;

    socketConnections.delete(userId);

    // Remove user from online tracking (fault-proof)
    await trackUserOffline(userId);
    console.log(`[socket] ✓ User ${userId} marked offline`);

    for (const [groupId, members] of groupRooms.entries()) {
      if (!members.has(userId)) continue;
      members.delete(userId);
      io.to(`group:${groupId}`).emit("memberCountUpdate", {
        groupId,
        count: members.size,
      });
    }
    for (const [challengeId, members] of challengeRooms.entries()) {
      if (!members.has(userId)) continue;
      members.delete(userId);
      io.to(`challenge:${challengeId}`).emit("participantCountUpdate", {
        challengeId,
        count: members.size,
      });
    }
  });
});

// ── Health check ─────────────────────────────────────────────────────────────────
expressApp.get("/health", (req, res) => {
  res.json({
    status: "ok",
    connections: socketConnections.size,
    groups: groupRooms.size,
    uptime: process.uptime(),
  });
});

// ── Get online users (real-time from actual socket connections) ─────────────────
expressApp.get("/api/online-users", (req, res) => {
  try {
    // Get online users from actual socket connections (most accurate)
    const onlineUsers = getOnlineUsersFromSockets();

    console.log(
      `[socket-server] /api/online-users - Returning ${onlineUsers.length} users (${socketConnections.size} connected sockets)`,
    );

    res.json({
      success: true,
      count: onlineUsers.length,
      users: onlineUsers,
      source: "active-connections",
      connectedSockets: socketConnections.size,
      memorySize: inMemoryOnlineUsers.size,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[socket-server] /api/online-users error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch online users",
    });
  }
});

// ── Get online user count ────────────────────────────────────────────────────────
expressApp.get("/api/online-count", (req, res) => {
  try {
    const onlineUsers = getOnlineUsersFromSockets();
    res.json({
      success: true,
      count: onlineUsers.length,
      connectedSockets: socketConnections.size,
    });
  } catch (error) {
    console.error("[socket-server] /api/online-count error:", error);
    res.status(500).json({ success: false, error: "Failed to get count" });
  }
});

expressApp.get("/", (req, res) => {
  res.json({ service: "BroCode Socket Server", status: "running" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Socket.io server running on port ${port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  console.log("[socket-server] SIGTERM received, shutting down...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
