'use client';

/**
 * useSocket — professional WebSocket hook
 *
 * Design decisions:
 *  - Module-level singleton socket so all components share ONE connection per session.
 *  - State (isConnected) lives outside React so status updates don't trigger re-renders
 *    of unrelated components.
 *  - No pre-flight health check (was causing 503 loops).
 *  - Clean event subscription API via `subscribe()` that returns an unsubscribe fn.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

// ── Singleton state (module scope) ─────────────────────────────────────────────
let _socket = null;
let _isConnected = false;
let _isConnecting = false;
const _stateListeners = new Set(); // () => void   — called on connect/disconnect

function notifyListeners() {
  _stateListeners.forEach(fn => fn());
}

async function getSocket(sessionUser) {
  if (_socket && (_socket.connected || _isConnecting)) return _socket;
  if (_isConnecting) return _socket;

  _isConnecting = true;

  const { io } = await import('socket.io-client');

  const url =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:${window.location.port || 3000}`
      : 'http://localhost:3000');

  _socket = io(url, {
    path: '/socket.io',
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  _socket.on('connect', () => {
    console.log('[socket] connected', _socket.id);
    _isConnected = true;
    _isConnecting = false;
    notifyListeners();

    // Identify user immediately after connect
    if (sessionUser) {
      _socket.emit('identify', {
        id: sessionUser.id,
        name: sessionUser.name,
        image: sessionUser.image,
      });
    }
  });

  _socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
    _isConnected = false;
    notifyListeners();

    // Server-initiated disconnect — reconnect manually
    if (reason === 'io server disconnect') {
      _socket.connect();
    }
  });

  _socket.io.on('reconnect_attempt', (n) => {
    console.log(`[socket] reconnect attempt #${n}`);
    _isConnecting = true;
    notifyListeners();
  });

  _socket.io.on('reconnect', () => {
    console.log('[socket] reconnected');
    _isConnecting = false;
    _isConnected = true;
    notifyListeners();

    if (sessionUser) {
      _socket.emit('identify', {
        id: sessionUser.id,
        name: sessionUser.name,
        image: sessionUser.image,
      });
    }
  });

  _socket.io.on('reconnect_failed', () => {
    console.warn('[socket] reconnection failed after all attempts');
    _isConnecting = false;
    notifyListeners();
  });

  _socket.on('connect_error', (err) => {
    console.error('[socket] connect error:', err.message);
    _isConnecting = false;
    notifyListeners();
  });

  return _socket;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export default function useSocket(options = {}) {
  const { data: session } = useSession();
  const [, forceRender] = useState(0); // trigger re-render on connection state change
  const mountedRef = useRef(true);

  // Re-render when connection state changes
  useEffect(() => {
    mountedRef.current = true;
    const listener = () => { if (mountedRef.current) forceRender(n => n + 1); };
    _stateListeners.add(listener);
    return () => {
      mountedRef.current = false;
      _stateListeners.delete(listener);
    };
  }, []);

  // Connect when session is ready
  useEffect(() => {
    if (!session?.user) return;
    getSocket(session.user).catch(err => {
      console.error('[socket] init error:', err);
    });
  }, [session?.user?.id]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const joinGroup = useCallback((groupId) => {
    if (!_socket?.connected || !groupId) return false;
    _socket.emit('joinGroup', groupId);
    return true;
  }, []);

  const joinChallenge = useCallback((challengeId) => {
    if (!_socket?.connected || !challengeId) return false;
    _socket.emit('joinChallenge', challengeId);
    return true;
  }, []);

  const sendMessage = useCallback((data) => {
    if (!_socket?.connected || !data?.groupId || !data?.content) return false;
    _socket.emit('sendMessage', data);
    return true;
  }, []);

  const sendTyping = useCallback((data) => {
    if (!_socket?.connected || !data?.groupId) return false;
    _socket.emit('typing', data);
    return true;
  }, []);

  const sendHeartbeat = useCallback((data) => {
    if (!_socket?.connected) return false;
    _socket.emit('heartbeat', data);
    return true;
  }, []);

  const submitSolution = useCallback((data) => {
    if (!_socket?.connected) return false;
    _socket.emit('submitSolution', data);
    return true;
  }, []);

  /** Subscribe to a socket event. Returns an unsubscribe function. */
  const subscribe = useCallback((event, callback) => {
    if (!_socket) return () => {};
    _socket.on(event, callback);
    return () => _socket?.off(event, callback);
  }, []);

  /** Force a manual reconnection */
  const reconnect = useCallback(() => {
    if (!session?.user) return;
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
    _isConnected = false;
    _isConnecting = false;
    getSocket(session.user).catch(err => console.error('[socket] reconnect error:', err));
  }, [session?.user]);

  return {
    socket: _socket,
    isConnected: _isConnected,
    isConnecting: _isConnecting,
    joinGroup,
    joinChallenge,
    sendMessage,
    sendTyping,
    sendHeartbeat,
    submitSolution,
    subscribe,
    reconnect,
  };
}
