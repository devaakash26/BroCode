const express = require("express");
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

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

  // Periodic cleanup of empty rooms
  setInterval(() => {
    for (const [id, members] of groupRooms.entries()) {
      if (members.size === 0) groupRooms.delete(id);
    }
    for (const [id, members] of challengeRooms.entries()) {
      if (members.size === 0) challengeRooms.delete(id);
    }
  }, 300000);

  // Helper: find userId by socketId
  function findUser(socketId) {
    for (const [id, data] of socketConnections.entries()) {
      if (data.socketId === socketId)
        return { userId: id, userData: data.userData };
    }
    return { userId: null, userData: null };
  }

  // ── Socket event handlers ────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log("[socket] connected:", socket.id);

    // Identify authenticated user
    socket.on("identify", (userData) => {
      if (!userData?.id) return;
      socketConnections.set(userData.id, { socketId: socket.id, userData });
      console.log(
        `[socket] user identified: ${userData.id} (${userData.name})`,
      );
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
        const { groupId, content } = data || {};
        if (!groupId || !content?.trim()) return;

        const { userId, userData } = findUser(socket.id);
        if (!userId) {
          socket.emit("error", { message: "User not identified" });
          return;
        }

        const trimmedContent = content.trim();

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
      if (!challengeRooms.has(challengeId))
        challengeRooms.set(challengeId, new Set());
      const { userId, userData } = findUser(socket.id);
      if (!userId) return;
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
    socket.on("disconnect", () => {
      console.log("[socket] disconnected:", socket.id);
      const { userId } = findUser(socket.id);
      if (!userId) return;

      socketConnections.delete(userId);

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
