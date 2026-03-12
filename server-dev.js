const express = require("express");
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const Redis = require("ioredis");

const prisma = new PrismaClient({ log: ["error"] });

// ── Redis client for online user tracking ───────────────────────────────────────
const REDIS_PROVIDER = process.env.REDIS_PROVIDER || "railway";
let redis = null;
let redisReady = false;

// In-memory fallback for online users (when Redis is unavailable)
const inMemoryOnlineUsers = new Map();

console.log(`[server-dev] 🔍 Checking Redis configuration...`);
console.log(`[server-dev] REDIS_PROVIDER: ${REDIS_PROVIDER}`);

// Initialize Redis based on provider
if (REDIS_PROVIDER === "railway") {
  const redisUrl = process.env.RAILWAY_REDIS_URL;
  console.log(`[server-dev] RAILWAY_REDIS_URL exists: ${!!redisUrl}`);

  if (redisUrl) {
    const urlStart = redisUrl.substring(0, 10);
    console.log(`[server-dev] URL starts with: ${urlStart}`);
  }

  // Check if Redis URL is valid (not empty and not placeholder)
  if (redisUrl && redisUrl.startsWith("redis://")) {
    console.log("[server-dev] 🔧 Initializing Redis connection...");
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(
          `[server-dev] Redis retry attempt ${times}, waiting ${delay}ms`,
        );
        return delay;
      },
      lazyConnect: false,
      enableOfflineQueue: true,
      reconnectOnError: (err) => {
        console.error(`[server-dev] Redis reconnect on error: ${err.message}`);
        return true;
      },
    });

    redis.on("error", (err) => {
      console.error("[server-dev] ❌ Redis error:", err.message);
      redisReady = false;
    });

    redis.on("connect", () => {
      console.log("[server-dev] 🔄 Redis connecting...");
    });

    redis.on("ready", () => {
      console.log("[server-dev] ✅ Redis ready - online tracking enabled");
      redisReady = true;

      // Sync in-memory users to Redis when connection is restored
      if (inMemoryOnlineUsers.size > 0) {
        console.log(
          `[server-dev] 📤 Syncing ${inMemoryOnlineUsers.size} users to Redis...`,
        );
        syncInMemoryToRedis();
      }
    });

    redis.on("close", () => {
      console.warn("[server-dev] ⚠️  Redis connection closed");
      redisReady = false;
    });

    redis.on("reconnecting", () => {
      console.log("[server-dev] 🔄 Redis reconnecting...");
    });
  } else {
    console.warn(
      "[server-dev] ⚠️  Railway Redis URL not configured or invalid",
    );
    console.warn("[server-dev] Expected format: redis://...");
  }
} else if (REDIS_PROVIDER === "upstash") {
  console.warn(
    "[server-dev] ⚠️  Upstash Redis not supported in dev server (use Railway)",
  );
} else {
  console.warn("[server-dev] ⚠️  No Redis provider - online tracking disabled");
}

// Helper: Sync in-memory users to Redis
async function syncInMemoryToRedis() {
  if (!redis || !redisReady) return;

  try {
    for (const [userId, userData] of inMemoryOnlineUsers.entries()) {
      await redis.setex(
        `user:online:${userId}`,
        1800,
        JSON.stringify(userData),
      );
    }
    console.log(
      `[server-dev] ✅ Synced ${inMemoryOnlineUsers.size} users to Redis`,
    );
  } catch (err) {
    console.error("[server-dev] Sync to Redis failed:", err);
  }
}

// Helper: Track user as online (with fallback)
async function trackUserOnline(userId, userData) {
  const userInfo = {
    id: userData.id,
    name: userData.name,
    image: userData.image,
    email: userData.email,
    lastSeen: new Date().toISOString(),
  };

  // Always store in memory as fallback
  inMemoryOnlineUsers.set(userId, userInfo);

  // Try to store in Redis
  if (redis && redisReady) {
    try {
      await redis.setex(
        `user:online:${userId}`,
        1800, // 30 minutes
        JSON.stringify(userInfo),
      );
      console.log(`[socket] ✅ Tracked user in Redis: ${userId}`);
      return true;
    } catch (err) {
      console.error(
        `[socket] ⚠️  Redis tracking failed for ${userId}:`,
        err.message,
      );
      console.log(`[socket] 📝 User ${userId} stored in memory (fallback)`);
      return false;
    }
  } else {
    console.log(
      `[socket] 📝 User ${userId} stored in memory (Redis not ready)`,
    );
    return false;
  }
}

// Helper: Remove user from tracking
async function trackUserOffline(userId) {
  // Remove from memory
  inMemoryOnlineUsers.delete(userId);

  // Try to remove from Redis
  if (redis && redisReady) {
    try {
      await redis.del(`user:online:${userId}`);
      console.log(`[socket] ✅ Removed user from Redis: ${userId}`);
      return true;
    } catch (err) {
      console.error(
        `[socket] ⚠️  Redis removal failed for ${userId}:`,
        err.message,
      );
      return false;
    }
  }
  return false;
}

// Heartbeat mechanism: Refresh Redis TTL every 10 minutes
setInterval(async () => {
  if (!redis || !redisReady || inMemoryOnlineUsers.size === 0) return;

  console.log(
    `[heartbeat] 💓 Refreshing TTL for ${inMemoryOnlineUsers.size} online users...`,
  );

  let successCount = 0;
  for (const [userId, userData] of inMemoryOnlineUsers.entries()) {
    try {
      await redis.setex(
        `user:online:${userId}`,
        1800,
        JSON.stringify({
          ...userData,
          lastSeen: new Date().toISOString(),
        }),
      );
      successCount++;
    } catch (err) {
      console.error(`[heartbeat] Failed to refresh ${userId}:`, err.message);
    }
  }

  console.log(
    `[heartbeat] ✅ Refreshed ${successCount}/${inMemoryOnlineUsers.size} users`,
  );
}, 600000); // Every 10 minutes

// Cleanup stale in-memory entries (older than 35 minutes)
setInterval(() => {
  const now = Date.now();
  const staleThreshold = 35 * 60 * 1000; // 35 minutes
  let removedCount = 0;

  for (const [userId, userData] of inMemoryOnlineUsers.entries()) {
    const lastSeen = new Date(userData.lastSeen).getTime();
    if (now - lastSeen > staleThreshold) {
      inMemoryOnlineUsers.delete(userId);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(
      `[cleanup] 🧹 Removed ${removedCount} stale entries from memory`,
    );
  }
}, 300000); // Every 5 minutes

// This server script uses Next.js in dev mode as a workaround for production build issues

// Force development mode for Next.js
const dev = true; // Always use development mode
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

console.log("Starting server in development mode as production workaround");
console.log(`- PORT: ${port}`);

// Global error handling
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Don't exit the process, just log the error
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit the process, just log the error
});

// Initialize Next.js app with dev mode
const nextConfig = {
  dev,
  hostname,
  port,
  conf: {
    compress: true,
    poweredByHeader: false,
  },
};

const app = next(nextConfig);
const nextHandler = app.getRequestHandler();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory:", uploadsDir);
}

// Prepare the Next.js app then set up the server
app.prepare().then(() => {
  // Create Express app and HTTP server
  const expressApp = express();
  const server = http.createServer(expressApp);

  // Enable compression
  const compression = require("compression");
  expressApp.use(compression());

  // Set security headers
  expressApp.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Socket.IO server configuration
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 30000,
    perMessageDeflate: { threshold: 1024 },
  });

  // Make io instance available globally for API routes
  global.io = io;

  // ── Connection tracking ─────────────────────────────────────────────────────
  class ConnectionManager {
    constructor() {
      this.connections = new Map();
    }
    set(id, data) {
      this.connections.set(id, data);
    }
    get(id) {
      return this.connections.get(id) || null;
    }
    delete(id) {
      this.connections.delete(id);
    }
    get size() {
      return this.connections.size;
    }
    entries() {
      return this.connections.entries();
    }
  }

  const socketConnections = new ConnectionManager();
  const groupRooms = new Map(); // groupId → Set<userId>
  const challengeRooms = new Map();
  // Reverse map: socketId → userId  (O(1) lookup, fixes findUser race)
  const socketToUser = new Map();

  // Periodic cleanup of empty rooms
  setInterval(() => {
    for (const [id, members] of groupRooms.entries()) {
      if (members.size === 0) groupRooms.delete(id);
    }
    for (const [id, members] of challengeRooms.entries()) {
      if (members.size === 0) challengeRooms.delete(id);
    }
  }, 300000);

  // Helper: find userId by socketId — O(1) via reverse map
  function findUser(socketId) {
    const userId = socketToUser.get(socketId);
    if (!userId) return { userId: null, userData: null };
    const data = socketConnections.get(userId);
    if (!data) return { userId: null, userData: null };
    return { userId, userData: data.userData };
  }

  // ── Socket event handlers ────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log("[socket] connected:", socket.id);

    // Identify authenticated user
    socket.on("identify", async (userData) => {
      if (!userData?.id) {
        console.warn(
          `[socket] Identify called without user ID for socket ${socket.id}`,
        );
        return;
      }

      // Remove old reverse-map entry for this user if they had a previous socket
      const existing = socketConnections.get(userData.id);
      if (existing?.socketId && existing.socketId !== socket.id) {
        socketToUser.delete(existing.socketId);
        console.log(`[socket] Replaced old socket for user ${userData.id}`);
      }

      socketConnections.set(userData.id, { socketId: socket.id, userData });
      socketToUser.set(socket.id, userData.id);

      // Track online user with fallback
      const tracked = await trackUserOnline(userData.id, userData);

      console.log(
        `[socket] ✓ User identified: ${userData.id} (${userData.name}) - Socket: ${socket.id} - Redis: ${tracked ? "YES" : "FALLBACK"}`,
      );

      // Send confirmation back to client
      socket.emit("identified", {
        success: true,
        userId: userData.id,
        trackedInRedis: tracked,
      });
    });

    // Join a group chat room
    socket.on("joinGroup", (groupId) => {
      if (!groupId) return;
      const room = `group:${groupId}`;
      socket.join(room);
      console.log(`[socket] ${socket.id} joined ${room}`);

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

      // Broadcast to ALL in room (including sender) — fixes "0 online" bug
      io.to(room).emit("memberActive", memberPayload);

      // Notify others that a new user joined (for toast notifications)
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

    // Send a message to a group
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
          // Use socket.to (exclude sender — client adds optimistic copy)
          socket.to(`challenge:${challengeId}`).emit("challengeMessage", msg);
          // Also echo back to sender so all clients get the confirmed message
          socket.emit("challengeMessage", msg);
          console.log(
            `[socket] challengeMessage → room challenge:${challengeId} from ${userId}`,
          );
          return;
        }

        // Persist to DB
        let dbMessage;
        try {
          dbMessage = await prisma.chatMessage.create({
            data: { content: trimmedContent, senderId: userId, groupId },
            select: { id: true, sentAt: true },
          });
        } catch (dbErr) {
          console.error("[socket] DB save error:", dbErr);
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

    // Typing indicator
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

    // Heartbeat — maintain presence
    socket.on("heartbeat", (data) => {
      try {
        const { groupId } = data || {};
        if (!groupId) return;
        const { userId, userData } = findUser(socket.id);
        if (!userId) return;

        if (!groupRooms.has(groupId)) groupRooms.set(groupId, new Set());
        groupRooms.get(groupId).add(userId);

        const room = `group:${groupId}`;
        // Broadcast to ALL including sender — so every client tracks everyone's presence
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
      } catch (err) {
        console.error("[socket] heartbeat error:", err);
      }
    });

    // Join challenge room
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

    // Disconnect
    // Send notification to specific user
    socket.on("sendNotification", ({ recipientId, notification }) => {
      if (!recipientId || !notification) return;

      const recipientConnection = socketConnections.get(recipientId);
      if (recipientConnection?.socketId) {
        io.to(recipientConnection.socketId).emit(
          "newNotification",
          notification,
        );
        console.log(
          `[socket] 📨 Sent notification to user ${recipientId}:`,
          notification.type,
        );
      } else {
        console.log(`[socket] ⚠️  User ${recipientId} not connected`);
      }
    });

    socket.on("disconnect", async (reason) => {
      console.log(`[socket] disconnected: ${socket.id} - Reason: ${reason}`);
      const { userId } = findUser(socket.id);
      socketToUser.delete(socket.id);
      if (!userId) return;

      socketConnections.delete(userId);

      // Remove user from online tracking
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

  // Health check route
  expressApp.get("/socket-health", (req, res) => {
    res.json({
      status: "ok",
      connections: socketConnections.size,
      groups: groupRooms.size,
      uptime: process.uptime(),
    });
  });

  // Attach io to requests for API routes
  expressApp.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Default route handler
  expressApp.all("*", (req, res) => {
    return nextHandler(req, res);
  });

  // Start the server
  server.listen(port, hostname, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Socket.IO running on port ${port}`);
  });
});
