// Simple script to test WebSocket connection
const { io } = require("socket.io-client");
require('dotenv').config();

// Test both Redis and WebSocket connections
async function testConnections() {
  console.log('Testing WebSocket connection...');
  
  // Create socket instance
  const socket = io("http://localhost:3000", {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 5,
    timeout: 10000
  });
  
  // Socket connection events
  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully with ID:', socket.id);
    
    // Send test identify event
    socket.emit('identify', {
      id: 'test-user',
      name: 'Test User',
      image: null
    });
    
    console.log('Sent identify event');
    
    // Try joining a test group
    socket.emit('joinGroup', 'test-group');
    console.log('Sent joinGroup event');
    
    // Send a heartbeat
    socket.emit('heartbeat', { groupId: 'test-group' });
    console.log('Sent heartbeat event');
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error.message);
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });
  
  // Listen for test events
  socket.on('memberActive', (data) => {
    console.log('Received memberActive event:', data);
  });
  
  socket.on('memberCountUpdate', (data) => {
    console.log('Received memberCountUpdate event:', data);
  });
  
  // Test HTTP endpoints
  try {
    console.log('Testing health endpoint...');
    const response = await fetch('http://localhost:3000/api/health');
    const data = await response.json();
    console.log('Health check result:', data);
  } catch (error) {
    console.error('Health check error:', error.message);
  }
  
  // Keep the process running for a bit to observe events
  setTimeout(() => {
    console.log('Test completed, disconnecting socket');
    socket.disconnect();
    process.exit(0);
  }, 10000);
}

testConnections().catch(console.error); 
