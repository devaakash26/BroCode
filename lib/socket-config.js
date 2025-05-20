const getSocketConfig = () => {
  // Get base URL from environment or default to host with port 3001
  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
    (typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : 'http://localhost:3001');

  return {
    url: baseUrl,
    options: {
      path: '/api/socket',
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