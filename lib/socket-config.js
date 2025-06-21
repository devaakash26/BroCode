const getSocketConfig = () => {
  // Get base URL from environment or default to host with port 3000
  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
    (typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : 'http://localhost:3000');

  return {
    url: baseUrl,
    options: {
      path: '/socket.io', // Updated to match server configuration
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: true, // Auto connect on initialization
      forceNew: true,    // Force a new connection
    }
  };
};

export default getSocketConfig; 
