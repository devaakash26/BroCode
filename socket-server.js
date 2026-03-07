/**
 * Standalone Socket.io server
 * Deploy this separately on Railway / Render / Fly.io
 * Your Next.js app on Vercel connects to this via NEXT_PUBLIC_SOCKET_URL
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const port = parseInt(process.env.PORT || "4000", 10);

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

// ── Connection tracking ──────────────────────────────────────────────────────────
const socketConnections = new Map(); // userId → { socketId, userData }
const groupRooms = new Map(); // groupId → Set<userId>
const challengeRooms = new Map(); // challengeId → Set<userId>

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
  for (const [userId, data] of socketConnections.entries()) {
    if (data.socketId === socketId) return { userId, userData: data.userData };
  }
  return { userId: null, userData: null };
}

// ── Socket event handlers ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("[socket] connected:", socket.id);

  socket.on("identify", (userData) => {
    if (!userData?.id) return;
    socketConnections.set(userData.id, { socketId: socket.id, userData });
    console.log(`[socket] identified: ${userData.id} (${userData.name})`);
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

  socket.on("sendMessage", (data) => {
    try {
      const { groupId, content } = data || {};
      if (!groupId || !content?.trim()) return;

      const { userId, userData } = findUser(socket.id);
      if (!userId) {
        socket.emit("error", { message: "User not identified" });
        return;
      }

      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        content: content.trim(),
        groupId,
        senderId: userId,
        senderName: userData?.name || "Unknown",
        senderImage: userData?.image || null,
        sentAt: new Date().toISOString(),
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

  socket.on("heartbeat", (data) => {
    try {
      const { groupId } = data || {};
      if (!groupId) return;
      const { userId, userData } = findUser(socket.id);
      if (!userId) return;

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
    } catch (err) {
      console.error("[socket] heartbeat error:", err);
    }
  });

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

// ── Health check ─────────────────────────────────────────────────────────────────
expressApp.get("/health", (req, res) => {
  res.json({
    status: "ok",
    connections: socketConnections.size,
    groups: groupRooms.size,
    uptime: process.uptime(),
  });
});

expressApp.get("/", (req, res) => {
  res.json({ service: "BroCode Socket Server", status: "running" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Socket.io server running on port ${port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});
