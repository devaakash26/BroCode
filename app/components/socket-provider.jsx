'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let socketInstance;
    let reconnectTimer;

    // Only run on client side and if not already initialized
    if (typeof window === 'undefined' || isInitialized) return;

    const initializeSocket = async () => {
      try {
        // Dynamically import socket.io-client
        const { io } = await import('socket.io-client');
        
        socketInstance = io({
          path: '/api/socketio',
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          timeout: 5000,
        });

        socketInstance.on('connect', () => {
          setIsConnected(true);
          console.log('Socket connected');
        });

        socketInstance.on('disconnect', () => {
          setIsConnected(false);
          console.log('Socket disconnected');
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
        });

        setSocket(socketInstance);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initializeSocket();

    // Clean up function
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [isInitialized]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

