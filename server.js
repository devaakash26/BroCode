const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Set NODE_ENV explicitly to development if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Log configuration for debugging - less verbose in production
if (process.env.NODE_ENV === 'development') {
  console.log('Starting server with config:');
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- PORT: ${process.env.PORT || '3000'}`);
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Memory leak protection in production
const memoryUsageMonitoring = setInterval(() => {
  if (process.env.NODE_ENV === 'production') {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    // Log only if memory usage is high
    if (memoryUsedMB > 900) { // Warning at 900MB
      console.warn(`High memory usage: ${memoryUsedMB}MB RSS, ${heapUsedMB}MB heap`);
    }
    
    // Force garbage collection if available and memory usage is critically high
    if (global.gc && memoryUsedMB > 950) {
      console.warn('Forcing garbage collection');
      global.gc();
    }
  }
}, 60000); // Check every minute

// Global error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Initialize Next.js app with optimized configuration
const nextConfig = {
  dev,
  hostname,
  port,
  conf: {
    compress: true, // Enable compression
    poweredByHeader: false, // Remove X-Powered-By header
  }
};

const app = next(nextConfig);
const nextHandler = app.getRequestHandler();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Prepare the Next.js app then set up the server
app.prepare().then(() => {
  // Create Express app and HTTP server
  const expressApp = express();
  const server = http.createServer(expressApp);
  
  // Production optimizations for Express
  if (process.env.NODE_ENV === 'production') {
    // Enable compression
    const compression = require('compression');
    expressApp.use(compression());
    
    // Set security headers
    expressApp.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }
  
  // Socket.IO server with optimized configuration
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.NEXTAUTH_URL || 'https://neetcode.vercel.app'] 
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'], // Add polling as fallback
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // Reduced to 1MB for production
    connectTimeout: 30000,
    // Production optimizations
    perMessageDeflate: {
      threshold: 1024, // Only compress messages larger than 1KB
    },
    // Cache adapters
    adapter: process.env.REDIS_URL ? require("@socket.io/redis-adapter") : null
  });
  
  // Make io instance available globally for API routes
  global.io = io;
  
  // Store active connections with expiry to prevent memory leaks
  class ConnectionManager {
    constructor(expiryMs = 3600000) { // 1 hour default
      this.connections = new Map();
      this.expiryMs = expiryMs;
    }

    set(id, data) {
      const expiry = Date.now() + this.expiryMs;
      this.connections.set(id, { ...data, expiry });
    }

    get(id) {
      const entry = this.connections.get(id);
      if (!entry) return null;
      
      // Refresh expiry on access
      entry.expiry = Date.now() + this.expiryMs;
      return entry;
    }

    delete(id) {
      this.connections.delete(id);
    }

    cleanup() {
      const now = Date.now();
      let removed = 0;
      
      for (const [id, data] of this.connections.entries()) {
        if (data.expiry < now) {
          this.connections.delete(id);
          removed++;
        }
      }
      
      if (removed > 0 && process.env.NODE_ENV === 'development') {
        console.log(`Cleaned up ${removed} expired connections`);
      }
    }

    get size() {
      return this.connections.size;
    }

    [Symbol.iterator]() {
      return this.connections[Symbol.iterator]();
    }

    entries() {
      return this.connections.entries();
    }
  }
  
  // Create optimized connection managers
  const socketConnections = new ConnectionManager();
  const groupRooms = new Map(); // Track users in group rooms
  const challengeRooms = new Map(); // Track users in challenge rooms
  
  // Periodic cleanup
  const cleanupInterval = setInterval(() => {
    socketConnections.cleanup();
    
    // Cleanup empty group rooms
    for (const [groupId, members] of groupRooms.entries()) {
      if (members.size === 0) {
        groupRooms.delete(groupId);
      }
    }
    
    // Cleanup empty challenge rooms
    for (const [challengeId, members] of challengeRooms.entries()) {
      if (members.size === 0) {
        challengeRooms.delete(challengeId);
      }
    }
  }, 300000); // Every 5 minutes
  
  // Debug socket.io connection events in development only
  if (process.env.NODE_ENV === 'development') {
    io.engine.on('connection_error', (err) => {
      console.error('Socket.io connection error:', err);
    });
  }
  
  // Socket connection handler
  io.on('connection', (socket) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Socket connected:', socket.id);
    }
    
    // Store socket connection with user ID when authenticated
    socket.on('identify', (userData) => {
      if (userData?.id) {
        socketConnections.set(userData.id, {
          socketId: socket.id,
          userData
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`User ${userData.id} (${userData.name || 'Unknown'}) identified with socket ${socket.id}`);
        }
      }
    });
    
    // Handle joining a group chat room
    socket.on('joinGroup', async (groupId) => {
      if (!groupId) return;
      
      const roomName = `group:${groupId}`;
      socket.join(roomName);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Socket ${socket.id} joined room ${roomName}`);
      }
      
      // Track room membership
      if (!groupRooms.has(groupId)) {
        groupRooms.set(groupId, new Set());
      }
      
      // Find user ID for this socket
      let userId = null;
      let userName = 'Unknown';
      
      for (const [id, data] of socketConnections.entries()) {
        if (data.socketId === socket.id) {
          userId = id;
          userName = data.userData?.name || 'Unknown';
          break;
        }
      }
      
      if (userId) {
        groupRooms.get(groupId).add(userId);
        
        // Notify other members about new active user
        socket.to(roomName).emit('memberActive', {
          userId,
          userName,
          timestamp: new Date().toISOString()
        });
        
        // Send active members count to all users in the room
        const memberCount = groupRooms.get(groupId).size;
        io.to(roomName).emit('memberCountUpdate', {
          groupId,
          count: memberCount
        });
      }
    });
    
    // Handle sending a message to a group
    socket.on('sendMessage', async (data) => {
      try {
        const { groupId, content } = data;
        if (!groupId || !content) return;
        
        // Find user ID for this socket
        let userId = null;
        let userData = null;
        
        for (const [id, data] of socketConnections.entries()) {
          if (data.socketId === socket.id) {
            userId = id;
            userData = data.userData;
            break;
          }
        }
        
        if (!userId) {
          socket.emit('error', { message: 'User not identified' });
          return;
        }
        
        // Create message object with timestamp
        const message = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          content,
          groupId,
          senderId: userId,
          senderName: userData?.name || 'Unknown',
          senderImage: userData?.image || null,
          sentAt: new Date().toISOString()
        };
        
        // Broadcast to room (including sender for confirmation)
        io.to(`group:${groupId}`).emit('newMessage', message);
      } catch (error) {
        console.error('Error in sendMessage:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle heartbeat to maintain user presence
    socket.on('heartbeat', (data) => {
      try {
        // Skip if no group ID provided
        if (!data || !data.groupId) return;
        
        const groupId = data.groupId;
        
        // Find user ID for this socket
        let userId = null;
        let userName = 'Unknown';
        
        for (const [id, data] of socketConnections.entries()) {
          if (data.socketId === socket.id) {
            userId = id;
            userName = data.userData?.name || 'Unknown';
            break;
          }
        }
        
        if (userId && groupRooms.has(groupId)) {
          // Ensure user is in the group room
          if (!groupRooms.get(groupId).has(userId)) {
            groupRooms.get(groupId).add(userId);
          }
          
          // Notify others that user is active
          const roomName = `group:${groupId}`;
          socket.to(roomName).emit('memberActive', {
            userId,
            userName,
            timestamp: new Date().toISOString()
          });
          
          // Update active members count
          const memberCount = groupRooms.get(groupId).size;
          io.to(roomName).emit('memberCountUpdate', {
            groupId,
            count: memberCount
          });
        }
      } catch (error) {
        console.error('Error in heartbeat:', error);
      }
    });
    
    // Handle email verification notification
    socket.on('email_verified', (data) => {
      console.log('Email verified event received:', data);
    });
    
    // Handle joining a challenge room
    socket.on('joinChallenge', async (challengeId) => {
      if (!challengeId) return;
      
      const roomName = `challenge:${challengeId}`;
      socket.join(roomName);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Socket ${socket.id} joined challenge room ${roomName}`);
      }
      
      // Track room membership
      if (!challengeRooms.has(challengeId)) {
        challengeRooms.set(challengeId, new Set());
      }
      
      // Find user ID for this socket
      let userId = null;
      let userName = 'Unknown';
      
      for (const [id, data] of socketConnections.entries()) {
        if (data.socketId === socket.id) {
          userId = id;
          userName = data.userData?.name || 'Unknown';
          break;
        }
      }
      
      if (userId) {
        challengeRooms.get(challengeId).add(userId);
        
        // Notify other members about new participant
        socket.to(roomName).emit('participantJoined', {
          userId,
          userName,
          timestamp: new Date().toISOString()
        });
        
        // Send participant count to all users in the room
        const participantCount = challengeRooms.get(challengeId).size;
        io.to(roomName).emit('participantCountUpdate', {
          challengeId,
          count: participantCount
        });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Socket disconnected:', socket.id);
      }
      
      // Find user associated with this socket
      let disconnectedUserId = null;
      
      for (const [userId, data] of socketConnections.entries()) {
        if (data.socketId === socket.id) {
          disconnectedUserId = userId;
          socketConnections.delete(userId);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`User ${userId} disconnected`);
          }
          break;
        }
      }
      
      // Remove user from all group rooms they were in
      if (disconnectedUserId) {
        for (const [groupId, members] of groupRooms.entries()) {
          if (members.has(disconnectedUserId)) {
            members.delete(disconnectedUserId);
            
            // Notify room about user leaving
            const roomName = `group:${groupId}`;
            io.to(roomName).emit('memberCountUpdate', {
              groupId,
              count: members.size
            });
          }
        }
        
        // Remove user from all challenge rooms they were in
        for (const [challengeId, members] of challengeRooms.entries()) {
          if (members.has(disconnectedUserId)) {
            members.delete(disconnectedUserId);
            
            // Notify room about participant leaving
            const roomName = `challenge:${challengeId}`;
            io.to(roomName).emit('participantCountUpdate', {
              challengeId,
              count: members.size
            });
          }
        }
      }
    });
  });
  
  // Add a health check route
  expressApp.get('/socket-health', (req, res) => {
    res.json({
      status: 'ok',
      connections: socketConnections.size,
      groups: groupRooms.size,
      uptime: process.uptime(),
      memory: process.env.NODE_ENV === 'production' ? undefined : process.memoryUsage()
    });
  });

  // Add a simple test route
  expressApp.get('/test', (req, res) => {
    res.send('Server is working correctly');
  });
  
  // Attach io instance to the request object
  expressApp.use((req, res, next) => {
    req.io = io;
    next();
  });

  // Handle all other requests with Next.js
  expressApp.all('*', (req, res) => {
      return nextHandler(req, res);
  });
  
  // Make socket connections accessible to API routes
  server.socketConnections = socketConnections;
  server.io = io;
  
  // Start the server with error handling
  try {
    server.listen(port, hostname, (err) => {
      if (err) {
        console.error('Error starting server:', err);
        return;
      }
      console.log(`> Ready on http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`> Socket.IO server running on port ${port}`);
      }
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}).catch(err => {
  console.error('Error preparing Next.js app:', err);
});

// Handle termination signals with proper cleanup
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  // Clean up resources
  clearInterval(memoryUsageMonitoring);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  // Clean up resources
  clearInterval(memoryUsageMonitoring);
  process.exit(0);
}); 
