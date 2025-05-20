const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Set NODE_ENV explicitly to development if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Log configuration for debugging
console.log('Starting server with config:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT || '3000'}`);

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Global error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Initialize Next.js app
const app = next({ dev, hostname, port });
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
  
  // Socket.IO server with correct configuration
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'], // Add polling as fallback
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 5e6, // 5MB
    connectTimeout: 30000
  });
  
  // Store active connections
  const socketConnections = new Map();
  const groupRooms = new Map(); // Track users in group rooms
  
  // Debug socket.io connection events
  io.engine.on('connection_error', (err) => {
    console.error('Socket.io connection error:', err);
  });
  
  // Socket connection handler
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // Store socket connection with user ID when authenticated
    socket.on('identify', (userData) => {
      if (userData?.id) {
        socketConnections.set(userData.id, {
          socketId: socket.id,
          userData
        });
        console.log(`User ${userData.id} (${userData.name || 'Unknown'}) identified with socket ${socket.id}`);
      }
    });
    
    // Handle joining a group chat room
    socket.on('joinGroup', async (groupId) => {
      if (!groupId) return;
      
      const roomName = `group:${groupId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room ${roomName}`);
      
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
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
      
      // Find user associated with this socket
      let disconnectedUserId = null;
      
      for (const [userId, data] of socketConnections.entries()) {
        if (data.socketId === socket.id) {
          disconnectedUserId = userId;
          socketConnections.delete(userId);
          console.log(`User ${userId} disconnected`);
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
      }
    });
  });
  
  // Add a health check route
  expressApp.get('/socket-health', (req, res) => {
    res.json({
      status: 'ok',
      connections: socketConnections.size,
      groups: groupRooms.size,
      uptime: process.uptime()
    });
  });

  // Add a simple test route
  expressApp.get('/test', (req, res) => {
    res.send('Server is working correctly');
  });
  
  // Let Next.js handle everything else
  expressApp.all('*', (req, res) => {
    try {
      return nextHandler(req, res);
    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  // Make socket connections accessible to API routes
  server.socketConnections = socketConnections;
  server.io = io;
  
  // Start the server with error handling
  try {
    server.listen(port, (err) => {
      if (err) {
        console.error('Error starting server:', err);
        return;
      }
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO server running on port ${port}`);
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

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 