const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// This server script uses Next.js in dev mode as a workaround for production build issues

// Force development mode for Next.js
const dev = true; // Always use development mode
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

console.log('Starting server in development mode as production workaround');
console.log(`- PORT: ${port}`);

// Global error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
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
  
  // Socket.IO server configuration
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 30000,
    perMessageDeflate: {
      threshold: 1024,
    }
  });
  
  // Basic socket connection handler
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
  
  // Default route handler
  expressApp.all('*', (req, res) => {
    return nextHandler(req, res);
  });
  
  // Start the server
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 
