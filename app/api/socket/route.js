import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { NextResponse } from 'next/server';

// Track active users and their sockets
let io;
let users = new Map();
let groupMembers = new Map();

export async function GET(req) {
  // This is just a health check endpoint
  return new NextResponse(
    JSON.stringify({ status: 'Socket server is running' }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Initialize Socket.IO server
if (!io) {
  const httpServer = createServer();
  
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/api/socket',
    addTrailingSlash: false,
  });
  
  // Start the HTTP server on a different port
  httpServer.listen(3001, () => {
    console.log('Socket.IO server running on port 3001');
  });
  
  // Set up socket connections
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // User identification
    socket.on('identify', (userData) => {
      if (!userData || !userData.id) return;
      
      console.log(`User identified: ${userData.name} (${userData.id})`);
      
      // Store user data
      users.set(userData.id, {
        socket: socket.id,
        userData
      });
      
      // Join user's private room for direct messages
      socket.join(`user:${userData.id}`);
    });
    
    // Join a group
    socket.on('joinGroup', (groupId) => {
      if (!groupId) return;
      
      console.log(`Socket ${socket.id} joining group: ${groupId}`);
      socket.join(`group:${groupId}`);
      
      // Track members in the group
      if (!groupMembers.has(groupId)) {
        groupMembers.set(groupId, new Set());
      }
      
      // Find the user ID for this socket
      let userId = null;
      for (const [key, value] of users.entries()) {
        if (value.socket === socket.id) {
          userId = key;
          break;
        }
      }
      
      if (userId) {
        groupMembers.get(groupId).add(userId);
        
        // Emit member count update to all in the group
        io.to(`group:${groupId}`).emit('memberCountUpdate', {
          groupId,
          count: groupMembers.get(groupId).size
        });
      }
    });
    
    // Join a challenge room
    socket.on('joinChallenge', (challengeId) => {
      if (!challengeId) return;
      
      console.log(`Socket ${socket.id} joining challenge: ${challengeId}`);
      socket.join(`challenge:${challengeId}`);
    });
    
    // Send a message
    socket.on('sendMessage', (data) => {
      if (!data || !data.groupId) return;
      
      console.log(`Message received for group ${data.groupId}`);
      
      // Find user data for this socket
      let userData = null;
      for (const [userId, userInfo] of users.entries()) {
        if (userInfo.socket === socket.id) {
          userData = userInfo.userData;
          break;
        }
      }
      
      if (!userData) return;
      
      // Create message object
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        groupId: data.groupId,
        challengeId: data.challengeId || null,
        content: data.content,
        senderId: userData.id,
        senderName: userData.name,
        senderImage: userData.image,
        sentAt: new Date().toISOString()
      };
      
      // Broadcast to the appropriate room
      if (data.challengeId) {
        io.to(`challenge:${data.challengeId}`).emit('newMessage', message);
      } else {
        io.to(`group:${data.groupId}`).emit('newMessage', message);
      }
    });
    
    // Typing indicator
    socket.on('typing', (data) => {
      if (!data || !data.groupId) return;
      
      // Find user data for this socket
      let userData = null;
      for (const [userId, userInfo] of users.entries()) {
        if (userInfo.socket === socket.id) {
          userData = userInfo.userData;
          break;
        }
      }
      
      if (!userData) return;
      
      // Create typing data
      const typingData = {
        groupId: data.groupId,
        challengeId: data.challengeId || null,
        userId: userData.id,
        userName: userData.name,
        userImage: userData.image,
        isTyping: data.isTyping,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast to the appropriate room
      if (data.challengeId) {
        socket.to(`challenge:${data.challengeId}`).emit('userTyping', typingData);
      } else {
        socket.to(`group:${data.groupId}`).emit('userTyping', typingData);
      }
    });
    
    // Heartbeat to maintain presence
    socket.on('heartbeat', (data) => {
      if (!data || !data.groupId) return;
      
      // Find user data for this socket
      let userData = null;
      for (const [userId, userInfo] of users.entries()) {
        if (userInfo.socket === socket.id) {
          userData = userInfo.userData;
          break;
        }
      }
      
      if (!userData) return;
      
      // Create active data
      const activeData = {
        groupId: data.groupId,
        userId: userData.id,
        userName: userData.name,
        userImage: userData.image,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast active status to the group
      io.to(`group:${data.groupId}`).emit('memberActive', activeData);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Find and remove the user
      let disconnectedUserId = null;
      
      for (const [userId, value] of users.entries()) {
        if (value.socket === socket.id) {
          disconnectedUserId = userId;
          users.delete(userId);
          break;
        }
      }
      
      // Update group member counts
      if (disconnectedUserId) {
        for (const [groupId, members] of groupMembers.entries()) {
          if (members.has(disconnectedUserId)) {
            members.delete(disconnectedUserId);
            
            // Notify group of updated count
            io.to(`group:${groupId}`).emit('memberCountUpdate', {
              groupId,
              count: members.size
            });
          }
        }
      }
    });
  });
}

export const dynamic = 'force-dynamic'; 
