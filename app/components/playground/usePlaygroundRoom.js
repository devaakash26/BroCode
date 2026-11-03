'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import toast from 'react-hot-toast';
import useSocket from '@/app/hooks/useSocket';

const REMOTE = 'remote';
const TYPING_TTL = 3500;
const TYPING_SEND_MS = 1500;

/**
 * Joins a playground room and keeps the shared Yjs doc, peers, chat and last
 * run in sync. Re-joins automatically after a socket reconnect and pushes any
 * edits made while offline.
 */
export default function usePlaygroundRoom(roomId) {
  const { socket, isConnected } = useSocket();
  const [doc] = useState(() => new Y.Doc());
  const joinedRef = useRef(false);
  const runningTimer = useRef(null);

  const [status, setStatus] = useState('connecting'); // connecting | ready | reconnecting | error | ended
  const [error, setError] = useState(null);
  const [room, setRoom] = useState(null);
  const [peers, setPeers] = useState([]);
  const [myPeerId, setMyPeerId] = useState(null);
  const [chat, setChat] = useState([]);
  const [runs, setRuns] = useState({}); // tab id → last run on that tab
  const [typers, setTypers] = useState({}); // userId → { name, at }
  const lastTypingSent = useRef(0);
  const [runningBy, setRunningBy] = useState(null);
  const [language, setLanguageState] = useState('cpp');
  // Bumped on every (re)join so the whiteboard reloads the server snapshot.
  const [snapshot, setSnapshot] = useState({ strokes: [], version: 0 });

  // Shared language lives in the Yjs doc so it converges like everything else.
  useEffect(() => {
    const meta = doc.getMap('meta');
    const sync = () => setLanguageState(meta.get('language') || 'cpp');
    meta.observe(sync);
    sync();
    return () => meta.unobserve(sync);
  }, [doc]);

  // Local Yjs edits → server.
  useEffect(() => {
    if (!socket) return;
    const onUpdate = (update, origin) => {
      if (origin !== REMOTE && joinedRef.current) socket.emit('pg:yjs', update);
    };
    doc.on('update', onUpdate);
    return () => doc.off('update', onUpdate);
  }, [doc, socket]);

  // Join (and re-join after every reconnect).
  useEffect(() => {
    if (!socket || !isConnected || !roomId) {
      if (joinedRef.current) setStatus('reconnecting');
      joinedRef.current = false;
      return;
    }
    let cancelled = false;

    socket.timeout(8000).emit('pg:join', { roomId }, (err, res) => {
      if (cancelled) return;
      if (err) res = { error: 'server_timeout' };
      if (!res?.ok) {
        setError(res?.error || 'server_error');
        setStatus(res?.error === 'ended' ? 'ended' : 'error');
        return;
      }
      if (res.yjs) {
        const serverState = new Uint8Array(res.yjs);
        Y.applyUpdate(doc, serverState, REMOTE);
        // Send back anything we have that the server doesn't (offline edits).
        const missing = Y.encodeStateAsUpdate(doc, Y.encodeStateVectorFromUpdate(serverState));
        if (missing.length > 2) socket.emit('pg:yjs', missing);
      }
      joinedRef.current = true;
      setRoom(res.room);
      setPeers(res.peers || []);
      setMyPeerId(res.peerId);
      setChat(res.chat || []);
      setRuns(res.run ? { [res.run.tab || 'main']: res.run } : {});
      setSnapshot((s) => ({ strokes: res.strokes || [], version: s.version + 1 }));
      setError(null);
      setStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [socket, isConnected, roomId, doc]);

  // Room-level events.
  useEffect(() => {
    if (!socket) return;
    const handlers = {
      'pg:yjs': (u) => Y.applyUpdate(doc, new Uint8Array(u), REMOTE),
      'pg:peers': setPeers,
      'pg:chat': (msg) => {
        setChat((c) => (c.length >= 200 ? [...c.slice(-150), msg] : [...c, msg]));
        // A message landing means they've stopped typing.
        setTypers((t) => {
          if (!t[msg.userId]) return t;
          const { [msg.userId]: _done, ...rest } = t;
          return rest;
        });
      },
      'pg:typing': ({ userId, name }) => setTypers((t) => ({ ...t, [userId]: { name, at: Date.now() } })),
      'pg:run': (r) => {
        setRuns((all) => ({ ...all, [r.tab || 'main']: r }));
        setRunningBy(null);
      },
      'pg:running': ({ running, name }) => {
        setRunningBy(running ? name : null);
        // If the runner drops mid-run we never hear back — don't block Run forever.
        clearTimeout(runningTimer.current);
        if (running) runningTimer.current = setTimeout(() => setRunningBy(null), 30_000);
      },
      'pg:ended': ({ by }) => {
        joinedRef.current = false;
        setStatus('ended');
        toast(`${by || 'The host'} ended the session`, { icon: '🏁' });
      },
      'pg:notice': ({ message }) => toast(message),
    };
    Object.entries(handlers).forEach(([e, fn]) => socket.on(e, fn));
    return () => Object.entries(handlers).forEach(([e, fn]) => socket.off(e, fn));
  }, [socket, doc]);

  // Expire typing indicators.
  useEffect(() => {
    const id = setInterval(() => {
      setTypers((t) => {
        const now = Date.now();
        const live = Object.entries(t).filter(([, v]) => now - v.at < TYPING_TTL);
        return live.length === Object.keys(t).length ? t : Object.fromEntries(live);
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Leave on unmount.
  useEffect(() => {
    return () => {
      if (joinedRef.current) socket?.emit('pg:leave');
      joinedRef.current = false;
    };
  }, [socket]);

  const setLanguage = useCallback(
    (lang) => doc.getMap('meta').set('language', lang),
    [doc],
  );

  const sendChat = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (!socket?.connected) return resolve(false);
        const t = setTimeout(() => resolve(false), 8000);
        socket.emit('pg:chat', { text }, (res) => {
          clearTimeout(t);
          resolve(!!res?.ok);
        });
      }),
    [socket],
  );

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (!socket?.connected || now - lastTypingSent.current < TYPING_SEND_MS) return;
    lastTypingSent.current = now;
    socket.emit('pg:typing');
  }, [socket]);

  /** Host only. Omit userId to mute everyone else in the call. */
  const muteUser = useCallback(
    (userId) => {
      socket?.emit('pg:mute', { userId: userId || null }, (res) => {
        if (res?.error) toast.error('Only the host can mute people');
      });
    },
    [socket],
  );

  const endSession = useCallback(() => {
    socket?.emit('pg:end', {}, (res) => {
      if (res?.error) toast.error('Only the host can end the session');
    });
  }, [socket]);

  return {
    socket,
    isConnected,
    doc,
    status,
    error,
    room,
    peers,
    myPeerId,
    chat,
    runs,
    typers,
    runningBy,
    setRunningBy,
    language,
    setLanguage,
    snapshot,
    sendChat,
    sendTyping,
    muteUser,
    endSession,
  };
}
