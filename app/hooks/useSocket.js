'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import getSocketConfig from '@/lib/socket-config';

export default function useSocket(options = {}) {
  const { disableToasts = false } = options;
  const { data: session } = useSession();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketInitializedRef = useRef(false);

  // Initialize socket connection
  const initSocket = useCallback(async () => {
    if (socketInitializedRef.current || !session?.user) return;

    setIsConnecting(true);
    socketInitializedRef.current = true;
    console.log('Initializing socket connection...', { user: session?.user });

    try {
      // First, check if the server is available
      try {
        const healthCheck = await fetch('/socket-health');
        const healthData = await healthCheck.json();
        console.log('Server health check:', healthData);
      } catch (error) {
        console.warn('Health check failed, continuing anyway:', error);
      }

      // Get socket configuration
      const socketConfig = getSocketConfig();
      console.log('Socket configuration:', socketConfig);

      // Create socket connection with config
      const { io } = await import('socket.io-client');
      const socketInstance = io(socketConfig.url, socketConfig.options);

      console.log('Socket instance created', socketInstance);

      // Socket event handlers
      socketInstance.on('connect', () => {
        console.log('Socket connected with ID:', socketInstance.id);
        setIsConnected(true);
        setIsConnecting(false);

        // Identify user to server
        if (session?.user) {
          console.log('Identifying user to server:', session.user);
          socketInstance.emit('identify', {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image
          });
        }
      });

      // Add reconnecting event handler
      socketInstance.io.on('reconnect_attempt', (attempt) => {
        console.log(`Socket reconnection attempt ${attempt}`);
      });

      socketInstance.io.on('reconnect', (attempt) => {
        console.log(`Socket reconnected after ${attempt} attempts`);
        setIsConnected(true);
        setIsConnecting(false);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected, reason:', reason);
        setIsConnected(false);

        // If the disconnection is due to a server error, try to reconnect
        if (reason === 'io server disconnect') {
          // The server has forcefully disconnected the socket
          console.log('Server disconnected socket, reconnecting...');
          socketInstance.connect();
        }
      });

      socketInstance.on('error', (data) => {
        console.error('Socket error:', data);
        if (!disableToasts) {
          toast.error(data.message || 'Connection error');
        }
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        setIsConnecting(false);
        socketInitializedRef.current = false;  // Allow retrying
        if (!disableToasts) {
          toast.error(`Connection error: ${err.message}`);
        }
      });

      // Add more debugging
      socketInstance.on('memberActive', (data) => {
        console.log('Member active event received:', data);
      });

      socketInstance.on('memberCountUpdate', (data) => {
        console.log('Member count update received:', data);
      });

      // Store socket instance
      setSocket(socketInstance);

      // Make sure socket connects
      if (!socketInstance.connected) {
        socketInstance.connect();
      }

      // Cleanup on unmount
      return () => {
        socketInstance.disconnect();
        socketInitializedRef.current = false;
      };
    } catch (error) {
      console.error('Socket initialization error:', error);
      setIsConnecting(false);
      socketInitializedRef.current = false;  // Allow retrying
      if (!disableToasts) {
        toast.error('Failed to establish real-time connection');
      }
    }
  }, [disableToasts, session]);

  // Join a group room
  const joinGroup = useCallback((groupId) => {
    if (!socket || !isConnected || !groupId) return false;
    console.log(`Joining group ${groupId}`);
    socket.emit('joinGroup', groupId);
    return true;
  }, [socket, isConnected]);

  // Join a challenge room
  const joinChallenge = useCallback((challengeId) => {
    if (!socket || !isConnected || !challengeId) return false;
    socket.emit('joinChallenge', challengeId);
    return true;
  }, [socket, isConnected]);

  // Send a chat message
  const sendMessage = useCallback((data) => {
    if (!socket || !isConnected || !data.groupId || !data.content) return false;
    console.log('Sending message via socket:', data);
    socket.emit('sendMessage', data);
    return true;
  }, [socket, isConnected]);

  // Send typing indicator
  const sendTyping = useCallback((data) => {
    if (!socket || !isConnected || !data.groupId) return false;
    socket.emit('typing', data);
    return true;
  }, [socket, isConnected]);

  // Submit a solution
  const submitSolution = useCallback((data) => {
    if (!socket || !isConnected) return false;
    socket.emit('submitSolution', data);
    return true;
  }, [socket, isConnected]);

  // Send heartbeat to keep presence alive
  const sendHeartbeat = useCallback((data) => {
    if (!socket || !isConnected) return false;
    console.log('Sending heartbeat');
    socket.emit('heartbeat', data);
    return true;
  }, [socket, isConnected]);

  // Subscribe to an event with automatic cleanup
  const subscribe = useCallback((event, callback) => {
    if (!socket) return () => { };

    console.log(`Subscribing to ${event} event`);
    socket.on(event, callback);

    // Return cleanup function
    return () => {
      socket.off(event, callback);
    };
  }, [socket]);

  // Manually reconnect (e.g. after a network change)
  const reconnect = useCallback(() => {
    console.log('Manually reconnecting socket');
    if (socket) {
      socket.disconnect();
    }
    socketInitializedRef.current = false;
    initSocket();
  }, [socket, initSocket]);

  // Auto-initialize socket when the hook is used and session is available
  useEffect(() => {
    if (session?.user) {
      console.log('Session available, initializing socket');
      initSocket();
    }

    // Cleanup on component unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [initSocket, socket, session]);

  return {
    socket,
    isConnected,
    isConnecting,
    joinGroup,
    joinChallenge,
    sendMessage,
    sendTyping,
    submitSolution,
    sendHeartbeat,
    subscribe,
    reconnect,
  };
} 
