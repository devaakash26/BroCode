'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Timer, UserPlus, Mic, MicOff, PhoneOff, Headphones, MessageSquare, LogOut, Power,
  Loader2, PenTool, Code2, Columns, Copy, WifiOff, Crown, Video, VideoOff, Users,
  ChevronDown, ChevronUp, X, LogIn,
} from 'lucide-react';
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

function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
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

function PeoplePill({ people, hostId, max }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        {people.slice(0, 5).map((u) => (
          <div
            key={u.userId}
            className="relative"
            title={`${u.name}${u.userId === hostId ? ' (host)' : ''}${u.voice ? (u.muted ? ' · muted' : ' · in call') : ''}`}
          >
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
      <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-300" title={`Up to ${max} people can join`}>
        <Users className="w-3.5 h-3.5 text-gray-400" />
        {people.length}/{max}
      </span>
    </div>
  );
}

function VideoTile({ stream, name, userId, mirrored, muted, speaking }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return (
    <div
      className={`relative w-48 aspect-video rounded-md overflow-hidden bg-gray-900 ring-2 ${
        speaking ? 'ring-emerald-500' : 'ring-transparent'
      }`}
    >
      {/* Audio plays through <RemoteAudio>; the video element stays muted. */}
      <video ref={ref} autoPlay playsInline muted className={`w-full h-full object-cover ${mirrored ? '-scale-x-100' : ''}`} />
      <div className="absolute left-1.5 bottom-1.5 flex items-center gap-1.5 max-w-[calc(100%-12px)] px-1.5 py-0.5 rounded bg-black/60">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: colorFor(userId) }} />
        <span className="text-[11px] font-semibold text-white truncate">{name}</span>
        {muted && <MicOff className="w-3 h-3 text-rose-400 ml-auto flex-shrink-0" />}
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

  const me = useMemo(
    () => ({ id: session?.user?.id || '', name: session?.user?.name || 'You' }),
    [session?.user?.id, session?.user?.name],
  );
  const isHost = pg.room?.hostId === me.id;

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

        <PeoplePill people={people} hostId={pg.room.hostId} max={maxPeers} />

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
            <button onClick={voice.join} disabled={voice.joining} className={GHOST_BTN}>
              {voice.joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
              Join call
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
              <Whiteboard socket={pg.socket} snapshot={pg.snapshot} me={me} peers={pg.peers} />
            </div>
          )}
          {view === 'split' && (
            <div onPointerDown={startDrag} className="group w-2 flex-shrink-0 flex items-center justify-center cursor-col-resize" title="Drag to resize">
              <span className="w-px h-full bg-transparent group-hover:bg-indigo-400 transition-colors" />
            </div>
          )}
          {showCode && (
            <div className="flex-1 min-w-0 h-full">
              <CompilerPanel pg={pg} />
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
              <PlaygroundChat messages={pg.chat} myUserId={me.id} onSend={pg.sendChat} />
            </div>
          </aside>
        )}

        <CallStage voice={voice} peers={pg.peers} me={me} myPeerId={pg.myPeerId} />
      </div>

      {Object.entries(voice.streams).map(([peerId, stream]) => (
        <RemoteAudio key={peerId} stream={stream} />
      ))}

      <InviteModal socket={pg.socket} roomId={roomId} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
