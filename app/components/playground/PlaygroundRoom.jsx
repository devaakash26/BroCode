'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Timer, UserPlus, Mic, MicOff, PhoneOff, Headphones, MessageSquare, LogOut, Power,
  Loader2, PenTool, Code2, Columns, Copy, WifiOff, Crown, Video, VideoOff,
  ChevronDown, ChevronUp, X, LogIn, PhoneCall, Maximize2, Minimize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import usePlaygroundRoom from './usePlaygroundRoom';
import useVoice from './useVoice';
import Whiteboard from './Whiteboard';
import CompilerPanel from './CompilerPanel';
import PlaygroundChat from './PlaygroundChat';
import InviteModal from './InviteModal';
import { colorFor, initials, formatElapsed, JOIN_ERRORS, GLASS, PANEL, PANEL_HEADER, ICON_BTN } from './utils';

// ── Small pieces ───────────────────────────────────────────────────────────────
function SessionTimer({ since }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-mono tabular-nums text-gray-600 dark:text-gray-300" title="Session time">
      <Timer className="w-3.5 h-3.5 text-gray-400" />
      {formatElapsed(now - since)}
    </span>
  );
}

function RemoteAudio({ stream, onBlocked }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    // Browsers (Safari especially) can refuse to start audio without a tap.
    // Report it instead of failing silently, so we can ask for one.
    ref.current.play().catch((err) => err?.name === 'NotAllowedError' && onBlocked?.());
  }, [stream, onBlocked]);
  return <audio ref={ref} autoPlay playsInline data-pg-remote-audio="" />;
}

function Avatar({ userId, name, size = 32, className = '' }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: colorFor(userId),
      }}
    >
      {initials(name)}
    </div>
  );
}

/** One entry per person (multiple tabs of the same user collapse into one). */
function usePeople(peers, speaking) {
  return useMemo(() => {
    const byUser = new Map();
    for (const p of peers) {
      const cur = byUser.get(p.userId);
      byUser.set(p.userId, {
        ...p,
        voice: !!cur?.voice || p.voice,
        camera: !!cur?.camera || p.camera,
        speaking: !!cur?.speaking || speaking.has(p.peerId),
      });
    }
    return [...byUser.values()];
  }, [peers, speaking]);
}

const CONN_LABEL = { connecting: 'connecting audio…', new: 'connecting audio…', failed: "can't connect audio", disconnected: 'audio dropped, retrying…' };

function PeopleMenu({ people, hostId, max, isHost, meId, onMute, connState }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const sorted = [...people].sort((a, b) => (b.userId === hostId) - (a.userId === hostId) || b.voice - a.voice);
  const mutable = people.filter((u) => u.voice && !u.muted && u.userId !== meId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
        title="People in this room"
      >
        <div className="flex items-center -space-x-2">
          {people.slice(0, 5).map((u) => (
            <div key={u.userId} className="relative">
              <Avatar
                userId={u.userId}
                name={u.name}
                size={26}
                className={`ring-2 ${u.speaking ? 'ring-emerald-500' : 'ring-white dark:ring-[#0d1119]'}`}
              />
              {u.userId === hostId && <Crown className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 text-amber-400 drop-shadow" />}
              {u.voice && (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                  {u.muted ? <MicOff className="w-2 h-2 text-rose-500" /> : <Mic className="w-2 h-2 text-emerald-500" />}
                </span>
              )}
            </div>
          ))}
          {people.length > 5 && (
            <div className="w-[26px] h-[26px] rounded-full ring-2 ring-white dark:ring-[#0d1119] bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-200">
              +{people.length - 5}
            </div>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-300">
          {people.length}/{max}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top right' }}
            className={`absolute right-0 top-full mt-2 w-72 z-50 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/50 ${GLASS}`}
          >
            <div className="flex items-center justify-between px-3 h-10 border-b border-gray-200 dark:border-white/[0.07]">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                In this room <span className="font-normal text-gray-400 tabular-nums">· {people.length}/{max}</span>
              </span>
              {isHost && mutable.length > 0 && (
                <button
                  type="button"
                  onClick={() => onMute(null)}
                  className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <MicOff className="w-3 h-3" /> Mute all
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {sorted.map((u) => (
                <li key={u.userId} className="flex items-center gap-2.5 px-3 h-11">
                  <Avatar userId={u.userId} name={u.name} size={26} className={u.speaking ? 'ring-2 ring-emerald-500' : ''} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm text-gray-800 dark:text-gray-100 truncate">
                      {u.name}
                      {u.userId === meId && <span className="text-gray-400 text-xs">(you)</span>}
                      {u.userId === hostId && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {!u.voice ? 'Not in call' : u.muted ? 'In call · muted' : u.speaking ? 'Speaking' : 'In call'}
                      {u.voice && u.userId !== meId && connState && CONN_LABEL[connState[u.peerId]] && (
                        <span className={connState[u.peerId] === 'failed' ? 'text-rose-500' : 'text-amber-500'}>
                          {' · '}
                          {CONN_LABEL[connState[u.peerId]]}
                        </span>
                      )}
                      {u.camera ? ' · camera on' : ''}
                    </span>
                  </span>
                  {u.voice &&
                    (isHost && u.userId !== meId && !u.muted ? (
                      <button
                        type="button"
                        onClick={() => onMute(u.userId)}
                        title={`Mute ${u.name}`}
                        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors"
                      >
                        <MicOff className="w-3 h-3" /> Mute
                      </button>
                    ) : u.muted ? (
                      <MicOff className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Mic className={`w-3.5 h-3.5 ${u.speaking ? 'text-emerald-500' : 'text-gray-400'}`} />
                    ))}
                </li>
              ))}
            </ul>
            {isHost && (
              <p className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-200 dark:border-white/[0.07]">
                As host you can mute anyone. They can unmute themselves.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Short two-tone ring, built with WebAudio so there is no asset to load. */
function playRing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    [[0, 660], [0.18, 880], [0.75, 660], [0.93, 880]].forEach(([d, f]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + d);
      o.stop(t0 + d + 0.32);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    // No audio (autoplay blocked, old browser) — the popup still shows.
  }
}

/** Blocking prompt shown when someone joins the call and you aren't in it. */
function CallPrompt({ prompt, callers, voice, onDismiss }) {
  useEffect(() => {
    if (!prompt) return undefined;
    playRing();
    let n = 1;
    const id = setInterval(() => (n++ < 4 ? playRing() : clearInterval(id)), 2800);
    return () => clearInterval(id);
  }, [prompt]);

  const lead = prompt?.names?.[0];
  const headline =
    callers.length <= 1 ? `${lead} started a call` : prompt?.names?.length > 1 ? `${prompt.names.join(' and ')} joined the call` : `${lead} joined the call`;

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          key="call-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="call-prompt-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl ${GLASS}`}
          >
            <div className="relative mx-auto w-16 h-16">
              {[0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-emerald-500"
                  animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
                />
              ))}
              <motion.span
                className="relative w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1.2 }}
              >
                <PhoneCall className="w-7 h-7" />
              </motion.span>
            </div>
            <h2 id="call-prompt-title" className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">{headline}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {callers.length} {callers.length === 1 ? 'person is' : 'people are'} talking. Join so you don&apos;t miss anything.
            </p>
            <div className="mt-4 flex justify-center -space-x-2">
              {callers.slice(0, 6).map((u) => (
                <Avatar key={u.userId} userId={u.userId} name={u.name} size={30} className="ring-2 ring-white dark:ring-[#11151f]" />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button onClick={voice.join} disabled={voice.joining} className={`${PRIMARY_BTN} !bg-emerald-600 hover:!bg-emerald-500 h-10`}>
                {voice.joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />} Join call
              </button>
              <button onClick={voice.toggleCamera} disabled={voice.joining} className={`${GHOST_BTN} h-10`}>
                <Video className="w-4 h-4" /> With camera
              </button>
            </div>
            <button onClick={onDismiss} className="mt-3 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
              Not now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Browser full screen, with the WebKit prefixes Safari still needs.
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function enterFullscreen(el, video) {
  if (el.requestFullscreen) return el.requestFullscreen().catch(() => {});
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  // iPhone Safari can only full-screen the <video> itself.
  if (video?.webkitEnterFullscreen) return video.webkitEnterFullscreen();
  return null;
}
function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen().catch(() => {});
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  return null;
}

function VideoTile({ stream, name, userId, mirrored, muted, speaking }) {
  const ref = useRef(null);
  const tileRef = useRef(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);

  // Track full screen however it ends (button, Esc, or the browser's own UI).
  useEffect(() => {
    const sync = () => setFull(fsElement() === tileRef.current);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  // Leaving the call while full screen shouldn't strand the user there.
  useEffect(() => () => fsElement() === tileRef.current && exitFullscreen(), []);

  const toggle = () => (full ? exitFullscreen() : enterFullscreen(tileRef.current, ref.current));

  return (
    <div
      ref={tileRef}
      onDoubleClick={toggle}
      className={`group relative overflow-hidden ${
        full ? 'w-screen h-screen bg-black' : `w-48 aspect-video rounded-md bg-gray-900 ring-2 ${speaking ? 'ring-emerald-500' : 'ring-transparent'}`
      }`}
      style={full && speaking ? { boxShadow: 'inset 0 0 0 4px #10b981' } : undefined}
    >
      {/* Audio plays through <RemoteAudio>; the video element stays muted. */}
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className={`w-full h-full ${full ? 'object-contain' : 'object-cover'} ${mirrored ? '-scale-x-100' : ''}`}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        title={full ? 'Exit full screen (Esc)' : 'Full screen'}
        aria-label={full ? `Exit full screen for ${name}` : `Show ${name} full screen`}
        className={`absolute top-1.5 right-1.5 inline-flex items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80 transition-opacity focus:opacity-100 ${
          full ? 'w-10 h-10 top-4 right-4 opacity-100' : 'w-7 h-7 opacity-0 group-hover:opacity-100'
        }`}
      >
        {full ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>

      <div
        className={`absolute flex items-center gap-1.5 rounded bg-black/60 ${
          full ? 'left-4 bottom-4 px-3 py-1.5 gap-2' : 'left-1.5 bottom-1.5 max-w-[calc(100%-12px)] px-1.5 py-0.5'
        }`}
      >
        <span className={`rounded-full ${full ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'}`} style={{ background: colorFor(userId) }} />
        <span className={`font-semibold text-white truncate ${full ? 'text-base' : 'text-[11px]'}`}>{name}</span>
        {muted && <MicOff className={`text-rose-400 ml-auto flex-shrink-0 ${full ? 'w-4 h-4' : 'w-3 h-3'}`} />}
        {full && speaking && <span className="text-xs font-medium text-emerald-400">speaking</span>}
      </div>
    </div>
  );
}

function CallStage({ voice, peers, me, myPeerId }) {
  const [collapsed, setCollapsed] = useState(false);
  const tiles = [];
  if (voice.camera && voice.localStream) {
    tiles.push({ key: 'me', stream: voice.localStream, name: `${me.name} (you)`, userId: me.id, mirrored: true, muted: voice.muted, speaking: voice.speaking.has(myPeerId) });
  }
  for (const p of peers) {
    const stream = voice.streams[p.peerId];
    if (p.peerId === myPeerId || !p.camera || !stream) continue;
    tiles.push({ key: `${p.peerId}-cam`, stream, name: p.name, userId: p.userId, muted: p.muted, speaking: voice.speaking.has(p.peerId) });
  }
  if (!tiles.length) return null;

  return (
    <div className={`absolute left-4 bottom-4 z-20 rounded-lg p-2 shadow-lg ${GLASS}`}>
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Video className="w-3 h-3" /> {tiles.length} on camera
        </span>
        <button onClick={() => setCollapsed((c) => !c)} className="p-0.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white" title={collapsed ? 'Show videos' : 'Hide videos'}>
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {!collapsed && (
        <div className="flex flex-wrap gap-2 max-w-[calc(3*12rem+1rem)]">
          {tiles.map(({ key, ...t }) => (
            <VideoTile key={key} {...t} />
          ))}
        </div>
      )}
    </div>
  );
}

function StateScreen({ icon, title, subtitle, children }) {
  return (
    <div className="h-full flex items-center justify-center px-6 bg-gray-50 dark:bg-[#0a0d14]">
      <div className={`w-full max-w-sm rounded-xl p-8 text-center ${GLASS}`}>
        <div className="mx-auto mb-4 w-12 h-12 rounded-lg bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors';
const GHOST_BTN =
  'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50';
const GROUP = 'flex items-center gap-0.5 p-0.5 rounded-md border border-gray-200 dark:border-white/10';

// ── Room ───────────────────────────────────────────────────────────────────────
export default function PlaygroundRoom({ roomId }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const pg = usePlaygroundRoom(roomId);
  const voice = useVoice({ socket: pg.socket, peers: pg.peers, myPeerId: pg.myPeerId });
  const people = usePeople(pg.peers, voice.speaking);

  const [view, setView] = useState('split'); // split | board | code
  const [split, setSplit] = useState(45); // board width %
  const [chatOpen, setChatOpen] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [seenChat, setSeenChat] = useState(0);
  const bodyRef = useRef(null);
  const boardApi = useRef(null); // filled by the Whiteboard while it is on screen

  const me = useMemo(
    () => ({ id: session?.user?.id || '', name: session?.user?.name || 'You', email: session?.user?.email || '' }),
    [session?.user?.id, session?.user?.name, session?.user?.email],
  );
  const isHost = pg.room?.hostId === me.id;
  const closeInvite = useCallback(() => setInviteOpen(false), []);

  // Remote audio the browser refused to autoplay; one tap starts it all.
  const [audioBlocked, setAudioBlocked] = useState(false);
  const onAudioBlocked = useCallback(() => setAudioBlocked(true), []);
  const unlockAudio = useCallback(() => {
    document.querySelectorAll('audio[data-pg-remote-audio]').forEach((a) => a.play().catch(() => {}));
    setAudioBlocked(false);
  }, []);

  // ── Call prompt: ring everyone who isn't in the call when someone joins it.
  const callers = useMemo(() => people.filter((p) => p.voice && p.userId !== me.id), [people, me.id]);
  const [callPrompt, setCallPrompt] = useState(null); // { names: [...] }
  const knownCallers = useRef(new Set());
  useEffect(() => {
    const ids = new Set(callers.map((c) => c.userId));
    const fresh = callers.filter((c) => !knownCallers.current.has(c.userId));
    knownCallers.current = ids;
    if (!ids.size) return setCallPrompt(null);
    if (fresh.length && !voice.inVoice) setCallPrompt({ names: fresh.map((c) => c.name), at: Date.now() });
  }, [callers, voice.inVoice]);
  useEffect(() => {
    if (voice.inVoice) setCallPrompt(null);
  }, [voice.inVoice]);

  // ── Host mute: each client mutes itself when asked.
  const { forceMute } = voice;
  useEffect(() => {
    const socket = pg.socket;
    if (!socket) return undefined;
    const onForceMute = ({ roomId: r, userId, hostId, by }) => {
      if (r !== roomId) return;
      if (userId ? userId !== me.id : me.id === hostId) return;
      if (forceMute()) toast(`${by} muted your mic`);
    };
    socket.on('pg:forceMute', onForceMute);
    return () => socket.off('pg:forceMute', onForceMute);
  }, [pg.socket, roomId, me.id, forceMute]);

  const typers = useMemo(
    () => Object.entries(pg.typers).filter(([id]) => id !== me.id).map(([userId, t]) => ({ userId, name: t.name })),
    [pg.typers, me.id],
  );

  // Narrow screens: one pane at a time.
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setView('code');
      setChatOpen(false);
    }
  }, []);

  useEffect(() => {
    if (chatOpen) setSeenChat(pg.chat.length);
  }, [chatOpen, pg.chat.length]);
  const unread = chatOpen ? 0 : Math.max(0, pg.chat.length - seenChat);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    const rect = bodyRef.current.getBoundingClientRect();
    const move = (ev) => setSplit(Math.min(75, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, []);

  const leave = () => {
    voice.leave();
    router.push('/playground');
  };

  const end = () => {
    if (window.confirm('End this session for everyone?')) pg.endSession();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/playground/${roomId}`);
      toast.success('Invite link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  // Hang up the call when the host ends the session.
  const { inVoice, leave: leaveVoice } = voice;
  useEffect(() => {
    if (pg.status === 'ended' && inVoice) leaveVoice();
  }, [pg.status, inVoice, leaveVoice]);

  // ── Non-ready states ─────────────────────────────────────────────────────────
  if (sessionStatus === 'unauthenticated') {
    return (
      <StateScreen
        icon={<LogIn className="w-6 h-6 text-indigo-500" />}
        title="Sign in to join this playground"
        subtitle="You need a BroCode account to code, draw and talk with the room."
      >
        <div className="flex flex-col gap-2">
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/playground/${roomId}`)}`} className={PRIMARY_BTN}>
            Sign in
          </Link>
          <Link href="/auth/signup" className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
            New here? Create an account
          </Link>
        </div>
      </StateScreen>
    );
  }
  if (pg.status === 'ended') {
    return (
      <StateScreen icon={<Power className="w-6 h-6 text-indigo-500" />} title="Session ended" subtitle={JOIN_ERRORS.ended}>
        <Link href="/playground" className={PRIMARY_BTN}>Start a new playground</Link>
      </StateScreen>
    );
  }
  if (pg.status === 'error') {
    return (
      <StateScreen
        icon={<PenTool className="w-6 h-6 text-indigo-500" />}
        title="Can't open this playground"
        subtitle={JOIN_ERRORS[pg.error] || JOIN_ERRORS.server_error}
      >
        <Link href="/playground" className={PRIMARY_BTN}>Back to Playground</Link>
      </StateScreen>
    );
  }
  if (!pg.room) {
    return (
      <StateScreen
        icon={<Loader2 className="w-6 h-6 animate-spin text-indigo-500" />}
        title="Joining playground…"
        subtitle={pg.isConnected ? 'Syncing the board and code' : 'Connecting to the live server'}
      />
    );
  }

  const showBoard = view !== 'code';
  const showCode = view !== 'board';
  const maxPeers = pg.room.maxPeers || 10;
  const segBtn = (v) =>
    `inline-flex items-center justify-center w-8 h-7 rounded transition-colors ${
      view === v
        ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
    }`;

  return (
    <div className="relative h-full flex flex-col bg-gray-50 dark:bg-[#0a0d14] overflow-hidden">

      {/* Top bar */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-2 flex-wrap bg-white dark:bg-[#0d1119] border-b border-gray-200 dark:border-white/[0.07]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-[240px] leading-tight">{pg.room.title}</h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Live
              </span>
            </div>
            <button onClick={copyLink} title="Copy invite link" className="group flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              Hosted by {pg.room.hostName} · <span className="font-mono">{roomId}</span>
              <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        <SessionTimer since={pg.room.createdAt} />
        {pg.status === 'reconnecting' && (
          <span className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-amber-500/10 text-xs font-medium text-amber-600 dark:text-amber-400">
            <WifiOff className="w-3.5 h-3.5" /> Reconnecting…
          </span>
        )}

        <div className="flex-1" />

        <div className={GROUP}>
          <button className={segBtn('board')} onClick={() => setView('board')} title="Scratchpad only">
            <PenTool className="w-4 h-4" />
          </button>
          <button className={`${segBtn('split')} hidden lg:inline-flex`} onClick={() => setView('split')} title="Scratchpad + compiler">
            <Columns className="w-4 h-4" />
          </button>
          <button className={segBtn('code')} onClick={() => setView('code')} title="Compiler only">
            <Code2 className="w-4 h-4" />
          </button>
        </div>

        <PeopleMenu people={people} hostId={pg.room.hostId} max={maxPeers} isHost={isHost} meId={me.id} onMute={pg.muteUser} connState={voice.inVoice ? voice.connState : null} />

        {/* Call controls */}
        {voice.inVoice ? (
          <div className={GROUP}>
            <button
              onClick={voice.toggleMute}
              title={voice.muted ? 'Unmute' : 'Mute'}
              className={`inline-flex items-center justify-center w-8 h-7 rounded transition-colors ${voice.muted ? 'bg-red-500/10 text-red-500' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              {voice.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={voice.toggleCamera}
              title={voice.camera ? 'Turn camera off' : 'Turn camera on'}
              className={`inline-flex items-center justify-center w-8 h-7 rounded transition-colors ${voice.camera ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
            >
              {voice.camera ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button onClick={voice.leave} title="Leave call" className="inline-flex items-center justify-center w-9 h-7 rounded bg-red-600 hover:bg-red-500 text-white transition-colors">
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={voice.join}
              disabled={voice.joining}
              className={callers.length ? `${GHOST_BTN} !border-emerald-500/40 !text-emerald-600 dark:!text-emerald-400 bg-emerald-500/[0.06]` : GHOST_BTN}
            >
              {voice.joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : callers.length ? (
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-70" />
                  <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
                </span>
              ) : (
                <Headphones className="w-4 h-4" />
              )}
              {callers.length ? `Join call · ${callers.length}` : 'Join call'}
            </button>
            <button onClick={voice.toggleCamera} disabled={voice.joining} className={`${GHOST_BTN} !px-2.5`} title="Join with camera">
              <Video className="w-4 h-4" />
            </button>
          </div>
        )}

        <button onClick={() => setInviteOpen(true)} className={PRIMARY_BTN}>
          <UserPlus className="w-4 h-4" /> Invite
        </button>

        <button
          onClick={() => setChatOpen((o) => !o)}
          title="Chat"
          className={`relative ${ICON_BTN} !w-9 !h-9 ${chatOpen ? '!bg-gray-100 dark:!bg-white/10 !text-gray-900 dark:!text-white' : ''}`}
        >
          <MessageSquare className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {isHost ? (
          <button onClick={end} title="End session for everyone" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors">
            <Power className="w-4 h-4" /> End
          </button>
        ) : (
          <button onClick={leave} title="Leave" className={`${ICON_BTN} !w-9 !h-9 hover:!text-red-500`}>
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Body */}
      <div className="relative z-0 flex-1 min-h-0 flex gap-2 p-2">
        <div ref={bodyRef} className="flex-1 min-w-0 flex">
          {showBoard && (
            <div className="min-w-0 h-full" style={{ width: view === 'split' ? `${split}%` : '100%' }}>
              <Whiteboard socket={pg.socket} snapshot={pg.snapshot} me={me} peers={pg.peers} doc={pg.doc} apiRef={boardApi} isHost={isHost} />
            </div>
          )}
          {view === 'split' && (
            <div onPointerDown={startDrag} className="group w-2 flex-shrink-0 flex items-center justify-center cursor-col-resize" title="Drag to resize">
              <span className="w-px h-full bg-transparent group-hover:bg-indigo-400 transition-colors" />
            </div>
          )}
          {showCode && (
            <div className="flex-1 min-w-0 h-full">
              <CompilerPanel pg={pg} me={me} isHost={isHost} boardApi={boardApi} />
            </div>
          )}
        </div>

        {chatOpen && (
          <aside className={`${PANEL} w-full sm:w-80 flex-shrink-0 flex flex-col absolute sm:static inset-2 sm:inset-auto z-30 sm:z-auto`}>
            <div className={PANEL_HEADER}>
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Chat</span>
              <span className="ml-auto text-xs text-gray-400">{people.length} here</span>
              <button onClick={() => setChatOpen(false)} className={`${ICON_BTN} !w-7 !h-7`} title="Close chat">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <PlaygroundChat messages={pg.chat} myUserId={me.id} onSend={pg.sendChat} typers={typers} onTyping={pg.sendTyping} />
            </div>
          </aside>
        )}

        <CallStage voice={voice} peers={pg.peers} me={me} myPeerId={pg.myPeerId} />
      </div>

      {Object.entries(voice.streams).map(([peerId, stream]) => (
        <RemoteAudio key={peerId} stream={stream} onBlocked={onAudioBlocked} />
      ))}

      {audioBlocked && voice.inVoice && (
        <button
          type="button"
          onClick={unlockAudio}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[65] inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-2xl shadow-indigo-900/40"
        >
          <Headphones className="w-4 h-4" /> Tap to turn on call sound
        </button>
      )}

      <CallPrompt prompt={callPrompt} callers={callers} voice={voice} onDismiss={() => setCallPrompt(null)} />

      <InviteModal
        socket={pg.socket}
        roomId={roomId}
        open={inviteOpen}
        onClose={closeInvite}
        isHost={isHost}
        me={me}
        title={pg.room.title}
        peopleInRoom={people.length}
      />
    </div>
  );
}
