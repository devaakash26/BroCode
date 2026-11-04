'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  Loader2, ArrowRight, ArrowUpRight, Plus, Users, LogIn, KeyRound, Check, Mic, MicOff, Crown,
  PhoneCall, BookOpen, Play, Code2, Video, Infinity as InfinityIcon,
} from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';
import useSocket from '@/app/hooks/useSocket';
import SessionReplay from '@/app/components/playground/landing/SessionReplay';
import CreatingRoom from '@/app/components/playground/landing/CreatingRoom';

const SURFACE = 'bg-white dark:bg-[#0f131c] border border-gray-200 dark:border-white/[0.07]';
const PRIMARY =
  'relative inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.2)]';
const signInUrl = (path) => `/auth/signin?callbackUrl=${encodeURIComponent(path)}`;
const EASE = [0.22, 1, 0.36, 1];

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.7, ease: EASE, delay },
});
const inView = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: EASE, delay },
});

function parseRoomId(input) {
  const v = input.trim();
  const fromUrl = v.match(/playground\/([A-Za-z0-9_-]{6,24})/);
  if (fromUrl) return fromUrl[1];
  return /^[A-Za-z0-9_-]{6,24}$/.test(v) ? v : null;
}

/** Hand-drawn underline, like a marker stroke on the scratchpad. */
function Scribble({ delay = 0.7 }) {
  return (
    <svg className="absolute left-[-2%] -bottom-1.5 sm:-bottom-2 w-[104%] h-3 overflow-visible" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
      <motion.path
        d="M2 8 C 40 3, 80 11, 120 6 S 180 4, 198 7"
        fill="none"
        stroke="#ef4444"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut', delay }}
      />
    </svg>
  );
}

/* ───────────────────────── feature cards ───────────────────────── */

function Card({ className = '', visual, title, text, delay = 0 }) {
  return (
    <motion.div
      {...inView(delay)}
      className={`group relative rounded-2xl overflow-hidden ${SURFACE} ${className}`}
    >
      <div className="relative h-56 overflow-hidden border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/60 dark:bg-white/[0.015]">
        <div
          className="absolute inset-0 opacity-60 dark:opacity-100 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
          style={{ backgroundImage: 'radial-gradient(rgba(100,116,139,0.22) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
          aria-hidden
        />
        {visual}
      </div>
      <div className="p-5">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{text}</p>
      </div>
    </motion.div>
  );
}

const MOCK = 'rounded-lg bg-white dark:bg-[#0b0f18] ring-1 ring-gray-200 dark:ring-white/[0.08] shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)]';

function TabsVisual() {
  const tabs = ['Two Sum', 'Valid Parentheses', 'LRU Cache'];
  const rows = [['Two Sum', 'Easy', 'text-emerald-500'], ['Valid Parentheses', 'Easy', 'text-emerald-500'], ['LRU Cache', 'Medium', 'text-amber-500'], ['Merge Intervals', 'Medium', 'text-amber-500']];
  return (
    <div className="absolute inset-x-6 top-6 sm:inset-x-10">
      <div className={`${MOCK} overflow-hidden`}>
        <div className="flex items-center gap-1 h-9 px-1.5 border-b border-gray-100 dark:border-white/[0.06] text-[11px]">
          {tabs.map((t, i) => (
            <motion.span
              key={t}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.25, type: 'spring', stiffness: 400, damping: 30 }}
              className={`h-6 px-2 rounded-md inline-flex items-center gap-1.5 font-medium ${i === 2 ? 'bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white' : 'text-gray-500'}`}
            >
              <span className="font-mono text-[9px] text-gray-400">{i + 1}</span>
              {t}
            </motion.span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 h-6 px-2 rounded-md text-gray-500">
            <BookOpen className="w-3 h-3" /> Problem
          </span>
        </div>
        <div className="grid grid-cols-[1fr_1.3fr] text-[11px]">
          <ul className="p-1.5 border-r border-gray-100 dark:border-white/[0.06]">
            {rows.map(([t, d, c], i) => (
              <li key={t} className={`flex items-center justify-between h-7 px-2 rounded ${i === 2 ? 'bg-indigo-500/10 text-gray-900 dark:text-white font-medium' : 'text-gray-500'}`}>
                <span className="truncate">{t}</span>
                <span className={`text-[9px] font-semibold ${c}`}>{d}</span>
              </li>
            ))}
          </ul>
          <div className="p-2.5 space-y-1.5">
            <div className="h-2.5 w-24 rounded bg-gray-800/80 dark:bg-gray-200/80" />
            <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-1.5 w-5/6 rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-1.5 w-4/6 rounded bg-gray-200 dark:bg-white/10" />
            <div className="pt-1 flex gap-1">
              {['C++', 'Java', 'Python'].map((l) => (
                <span key={l} className="px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-medium">{l}</span>
              ))}
            </div>
            <motion.div
              initial={{ scale: 0.96 }}
              whileInView={{ scale: [0.96, 1.03, 1] }}
              viewport={{ once: true }}
              transition={{ delay: 1.3, duration: 0.5 }}
              className="mt-1 h-6 rounded bg-indigo-600 text-white text-[10px] font-medium flex items-center justify-center"
            >
              Load “LRU Cache”
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HostVisual() {
  const people = [['Aakash', '#6366f1', 'host'], ['Riya', '#ec4899', 'mute'], ['Sam', '#10b981', 'live']];
  return (
    <div className="absolute inset-x-6 top-6">
      <div className={`${MOCK} text-[11px]`}>
        <div className="flex items-center justify-between h-8 px-3 border-b border-gray-100 dark:border-white/[0.06]">
          <span className="font-semibold text-gray-700 dark:text-gray-200">In this room · 3/10</span>
          <span className="inline-flex items-center gap-1 text-rose-500 font-medium"><MicOff className="w-3 h-3" /> Mute all</span>
        </div>
        {people.map(([n, c, s]) => (
          <div key={n} className="flex items-center gap-2 h-10 px-3">
            <span className="w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: c }}>{n[0]}</span>
            <span className="flex-1 flex items-center gap-1 text-gray-800 dark:text-gray-100">
              {n} {s === 'host' && <Crown className="w-3 h-3 text-amber-400" />}
            </span>
            {s === 'mute' ? (
              <motion.span
                initial={{ opacity: 1 }}
                whileInView={{ opacity: [1, 1, 0] }}
                viewport={{ once: true }}
                transition={{ delay: 0.9, duration: 0.4, times: [0, 0.6, 1] }}
                className="relative"
              >
                <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300">
                  <MicOff className="w-3 h-3" /> Mute
                </span>
              </motion.span>
            ) : (
              <Mic className={`w-3.5 h-3.5 ${s === 'live' ? 'text-emerald-500' : 'text-gray-400'}`} />
            )}
            {s === 'mute' && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.3, type: 'spring', stiffness: 500, damping: 22 }}
                className="absolute right-3"
              >
                <MicOff className="w-3.5 h-3.5 text-rose-500" />
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-x-6 top-6 bottom-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
      <motion.div
        animate={reduce ? undefined : { y: [0, -90, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className={`${MOCK} p-4 h-[320px] relative`}
      >
        <div className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white">Two Sum</div>
        <div className="text-[10px] text-gray-400">Easy · Arrays · Hash Table</div>
        <div className="mt-2 space-y-1">
          <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-1.5 w-4/5 rounded bg-gray-200 dark:bg-white/10" />
        </div>
        <div className="absolute right-4 top-12 w-24 rotate-2 rounded bg-amber-200 dark:bg-amber-300 p-2 text-[10px] font-medium text-gray-800 shadow">
          use a hash map, one pass
        </div>
        <svg viewBox="0 0 200 120" className="absolute left-3 top-24 w-48 h-28" aria-hidden>
          <rect x="6" y="20" width="60" height="30" rx="3" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <text x="36" y="39" textAnchor="middle" fontSize="10" fill="#3b82f6" fontFamily="ui-monospace,monospace">seen</text>
          <path d="M66 35 L130 35 M122 29 L130 35 L122 41" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="136" y="39" fontSize="10" fill="currentColor" className="text-gray-500" fontFamily="ui-monospace,monospace">i, j</text>
        </svg>
        <div className="absolute left-4 right-4 top-[170px] rounded bg-gray-50 dark:bg-white/[0.04] ring-1 ring-gray-200 dark:ring-white/10 p-2 font-mono text-[10px] text-gray-600 dark:text-gray-300">
          Input: [2,7,11,15], 9<br />Output: [0,1]
        </div>
        <div className="absolute left-4 top-[240px] text-[12px] font-semibold text-gray-800 dark:text-gray-100">Constraints</div>
        <div className="absolute left-4 top-[260px] text-[10px] text-gray-500 leading-relaxed">• 2 ≤ n ≤ 10⁴<br />• exactly one answer</div>
      </motion.div>
    </div>
  );
}

function RunVisual() {
  const rows = [['[2,7,11,15], 9', '[0,1]'], ['[3,2,4], 6', '[1,2]'], ['[3,3], 6', '[0,1]'], ['[1,5,9], 10', '[0,2]'], ['[0,4,0], 0', '[0,2]']];
  return (
    <div className="absolute inset-x-6 top-6">
      <div className={`${MOCK} text-[10.5px] font-mono overflow-hidden`}>
        <div className="flex items-center gap-2 h-8 px-3 border-b border-gray-100 dark:border-white/[0.06] font-sans">
          <span className="font-semibold text-gray-700 dark:text-gray-200">Inputs 5/10</span>
          <span className="ml-auto inline-flex items-center gap-1 h-5 px-2 rounded bg-emerald-600 text-white text-[10px] font-medium">
            <Play className="w-2.5 h-2.5 fill-current" /> Run
          </span>
        </div>
        {rows.map(([i, o], k) => (
          <div key={i} className="grid grid-cols-[14px_1fr_auto] items-center gap-2 h-7 px-3 border-t border-gray-50 dark:border-white/[0.04]">
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + k * 0.22, type: 'spring', stiffness: 500, damping: 20 }}
              className="w-3 h-3 rounded-full bg-emerald-500/15 flex items-center justify-center"
            >
              <Check className="w-2 h-2 text-emerald-500" strokeWidth={4} />
            </motion.span>
            <span className="text-gray-500 truncate">{i}</span>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + k * 0.22 }}
              className="text-gray-800 dark:text-gray-100"
            >
              {o}
            </motion.span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CallVisual() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className={`${MOCK} w-56 p-4 text-center`}>
        <div className="relative mx-auto w-11 h-11">
          {!reduce &&
            [0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2 border-emerald-500"
                animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.9, ease: 'easeOut' }}
              />
            ))}
          <span className="relative w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <PhoneCall className="w-5 h-5" />
          </span>
        </div>
        <p className="mt-3 text-[12px] font-semibold text-gray-900 dark:text-white">Riya started a call</p>
        <p className="text-[10px] text-gray-500">2 people are talking</p>
        <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] font-medium">
          <span className="h-6 rounded bg-emerald-600 text-white flex items-center justify-center gap-1"><Mic className="w-3 h-3" /> Join</span>
          <span className="h-6 rounded border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1"><Video className="w-3 h-3" /> Camera</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function PlaygroundHome() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { socket, isConnected, lastError } = useSocket();
  const { data: session, status: sessionStatus } = useSession();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('host'); // host | join
  const [creating, setCreating] = useState(false);
  const [launch, setLaunch] = useState(null); // { title, roomId } while the loader plays
  const [recent, setRecent] = useState(null); // null = loading
  const inputRef = useRef(null);
  const stageRef = useRef(null);

  const signedOut = sessionStatus === 'unauthenticated';

  // The product shot leans back and flattens as it scrolls into place.
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start end', 'start 35%'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 18, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.92, 1]);
  const lift = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 40, 0]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      if (sessionStatus === 'unauthenticated') setRecent([]);
      return;
    }
    const controller = new AbortController();
    fetch('/api/playground/sessions', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((d) => setRecent(d.sessions || []))
      .catch((err) => err.name !== 'AbortError' && setRecent([]));
    return () => controller.abort();
  }, [sessionStatus]);

  const create = (e) => {
    e?.preventDefault();
    if (!socket?.connected) return toast.error('Still connecting to the live server…');
    if (creating) return;
    setCreating(true);
    // Same default name the server uses.
    setLaunch({ title: title.trim() || `${session?.user?.name || 'Your'}'s playground`, roomId: null });
    const fail = (msg) => {
      setCreating(false);
      setLaunch(null);
      toast.error(msg);
    };
    const attempt = (retry) =>
      socket.timeout(8000).emit('pg:create', { title }, (err, res) => {
        if (err) return fail('Live server did not respond — is the socket server running the latest code?');
        // The socket may not be identified for a split second after connecting.
        if (res?.error === 'not_identified' && retry) return setTimeout(() => attempt(false), 600);
        if (!res?.ok) return fail('Could not create playground');
        // Warm the room page up while the loader finishes.
        router.prefetch(`/playground/${res.roomId}`);
        setLaunch((l) => (l ? { ...l, roomId: res.roomId } : l));
      });
    attempt(true);
  };

  const join = (e) => {
    e.preventDefault();
    const id = parseRoomId(code);
    if (!id) return toast.error('Paste a playground link or code');
    router.push(signedOut ? signInUrl(`/playground/${id}`) : `/playground/${id}`);
  };

  const enterRoom = useCallback(() => {
    if (launch?.roomId) router.push(`/playground/${launch.roomId}`);
  }, [launch?.roomId, router]);

  const switchMode = (m) => {
    setMode(m);
    setTimeout(() => inputRef.current?.focus(), 220); // after the input swap animation
  };

  const busy = creating || (!isConnected && !signedOut);
  const hosting = mode === 'host';

  return (
    <div className="relative overflow-x-clip">
      <CreatingRoom open={!!launch} title={launch?.title} roomId={launch?.roomId} onDone={enterRoom} />
      {/* ── backdrop ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.55] dark:opacity-100 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(100,116,139,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.12) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="absolute left-1/2 top-[-280px] -translate-x-1/2 w-[980px] h-[560px] rounded-full bg-indigo-500/[0.16] dark:bg-indigo-500/[0.2] blur-[120px]" />
      </div>

      {/* ── hero ── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 text-center">
        <motion.button
          {...rise(0)}
          type="button"
          onClick={() => document.getElementById('pg-features')?.scrollIntoView({ behavior: 'smooth' })}
          className="group inline-flex items-center gap-2 h-8 pl-1 pr-3 rounded-full border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur text-xs text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
        >
          <span className="h-6 px-2 rounded-full bg-indigo-600 text-white font-semibold inline-flex items-center">New</span>
          Load any BroCode problem straight into a room
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 transition-transform group-hover:translate-x-0.5" />
        </motion.button>

        <motion.h1
          {...rise(0.08)}
          className="mt-7 mx-auto max-w-4xl text-[2.5rem] leading-[1.06] sm:text-6xl lg:text-[4.25rem] font-semibold tracking-[-0.045em] text-gray-900 dark:text-white [text-wrap:balance]"
        >
          Solve problems out loud,{' '}
          <span className="relative inline-block whitespace-nowrap">
            together
            <Scribble />
          </span>
          .
        </motion.h1>

        <motion.p
          {...rise(0.16)}
          className="mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-400 [text-wrap:balance]"
        >
          Open a room and share the link. Everyone gets the same editor, an endless scratchpad, voice and chat, all in one tab. Built for mock interviews and pair practice.
        </motion.p>

        {/* command bar */}
        <motion.div {...rise(0.24)} className="mt-9 mx-auto max-w-xl">
          <form
            onSubmit={hosting ? create : join}
            className="flex items-center gap-1.5 p-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0f131c]/90 backdrop-blur shadow-[0_10px_40px_-12px_rgba(79,70,229,0.35)] focus-within:border-indigo-400/60 dark:focus-within:border-indigo-400/40 transition-colors"
          >
            <span className="pl-2.5 text-gray-400">{hosting ? <Plus className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.input
                key={mode}
                ref={inputRef}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                value={hosting ? title : code}
                onChange={(e) => (hosting ? setTitle(e.target.value) : setCode(e.target.value))}
                maxLength={hosting ? 60 : 200}
                placeholder={hosting ? 'Name your session (optional)' : 'Paste an invite link or room code'}
                aria-label={hosting ? 'Session name' : 'Invite link or room code'}
                className={`flex-1 min-w-0 h-10 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none ${hosting ? '' : 'font-mono'}`}
              />
            </AnimatePresence>
            {hosting && signedOut ? (
              <Link href={signInUrl('/playground')} className={`${PRIMARY} h-10 px-4 flex-shrink-0`}>
                <LogIn className="w-4 h-4" /> Sign in to start
              </Link>
            ) : (
              <button type="submit" disabled={hosting && busy} className={`${PRIMARY} group h-10 px-4 flex-shrink-0`}>
                {hosting && busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {hosting ? (sessionStatus === 'loading' ? 'Loading…' : isConnected ? 'Create room' : 'Connecting…') : 'Join room'}
                {!(hosting && busy) && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            )}
          </form>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {hosting ? (
              <>
                Got an invite?{' '}
                <button type="button" onClick={() => switchMode('join')} className="font-medium text-gray-900 dark:text-white hover:underline underline-offset-4">
                  Join with a code
                </button>
              </>
            ) : (
              <>
                Want your own room?{' '}
                <button type="button" onClick={() => switchMode('host')} className="font-medium text-gray-900 dark:text-white hover:underline underline-offset-4">
                  Host one instead
                </button>
              </>
            )}
            {signedOut && (
              <>
                {' · '}
                <Link href="/auth/signup" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4">
                  Create an account
                </Link>
              </>
            )}
          </p>
          {!isConnected && sessionStatus === 'authenticated' && (
            <p className="mt-2 text-[11px] text-gray-400 font-mono break-all">
              {!session?.user?.id
                ? 'session: signed in but user id missing'
                : `socket: ${socket ? 'connecting' : 'not started'} → ${process.env.NEXT_PUBLIC_SOCKET_URL || '(no NEXT_PUBLIC_SOCKET_URL)'}${lastError ? ` · error: ${lastError}` : ''}`}
            </p>
          )}
        </motion.div>

        <motion.ul {...rise(0.32)} className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-gray-500 dark:text-gray-400">
          {[
            [Users, 'Up to 10 people'],
            [Code2, 'C, C++, Java, JavaScript, Python'],
            [Mic, 'Voice and camera'],
            [InfinityIcon, 'Endless scratchpad'],
          ].map(([Icon, label]) => (
            <li key={label} className="inline-flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" /> {label}
            </li>
          ))}
        </motion.ul>
      </section>

      {/* ── product shot ── */}
      <section ref={stageRef} className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20 [perspective:1600px]">
        <motion.div style={{ rotateX, scale, y: lift, transformOrigin: 'center top' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.35 }}>
          <SessionReplay />
        </motion.div>
      </section>

      {/* ── features ── */}
      <section id="pg-features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-36 scroll-mt-8">
        <motion.div {...inView()} className="max-w-2xl">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Inside every room</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-gray-900 dark:text-white [text-wrap:balance]">
            Everything an interview needs, nothing it doesn&apos;t.
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed">
            The host runs the room: picks the questions, moves everyone between them, and keeps the call in order.
          </p>
        </motion.div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            className="lg:col-span-2"
            visual={<TabsVisual />}
            title="A tab for every question"
            text="Load any BroCode problem with its starter code for each language and its sample inputs. Each question gets its own tab, and the host can bring everyone to one."
          />
          <Card
            delay={0.05}
            visual={<HostVisual />}
            title="Host controls"
            text="See who's talking, mute one person or everyone. People can unmute themselves."
          />
          <Card
            delay={0.05}
            visual={<BoardVisual />}
            title="A scratchpad that keeps going"
            text="Draw, add headings, lists, code and sticky notes. It grows as you scroll."
          />
          <Card
            delay={0.1}
            visual={<RunVisual />}
            title="Run against ten inputs"
            text="One click runs every input. Everyone sees the same results."
          />
          <Card
            delay={0.15}
            visual={<CallVisual />}
            title="Calls that ring"
            text="When someone joins the call, everyone else gets a prompt to join."
          />
        </div>
      </section>

      {/* ── recent ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Your rooms</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rooms you hosted or joined. Active ones open straight back up.</p>
          </div>
          {recent?.length > 0 && <span className="text-xs text-gray-400 tabular-nums">{recent.length} total</span>}
        </div>
        {recent === null ? (
          <div className={`rounded-xl ${SURFACE} divide-y divide-gray-200 dark:divide-white/[0.07]`}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 px-4 flex items-center gap-4">
                <span className="h-3 w-40 rounded bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
                <span className="ml-auto h-3 w-20 rounded bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className={`rounded-xl ${SURFACE} px-6 py-12 text-center`}>
            <div className="mx-auto w-10 h-10 rounded-full border border-dashed border-gray-300 dark:border-white/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {signedOut ? (
                <>
                  <Link href={signInUrl('/playground')} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    Sign in
                  </Link>{' '}
                  to see the rooms you host or join.
                </>
              ) : (
                'No rooms yet. The ones you host or join will show up here.'
              )}
            </p>
          </div>
        ) : (
          <div className={`rounded-xl overflow-hidden ${SURFACE}`}>
            <div className="hidden sm:grid grid-cols-[1fr_120px_90px_130px_24px] gap-4 px-4 h-9 items-center text-[11px] font-medium uppercase tracking-wide text-gray-400 border-b border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02]">
              <span>Name</span>
              <span>Host</span>
              <span>Status</span>
              <span>Last active</span>
              <span />
            </div>
            {recent.map((r, i) => {
              const live = r.status === 'ACTIVE';
              const Row = live ? Link : 'div';
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE, delay: Math.min(i, 8) * 0.04 }}
                  className="border-b last:border-0 border-gray-200 dark:border-white/[0.07]"
                >
                  <Row
                    {...(live ? { href: `/playground/${r.id}` } : {})}
                    className={`group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_90px_130px_24px] gap-4 px-4 h-14 items-center ${live ? 'hover:bg-gray-50 dark:hover:bg-white/[0.03]' : ''} transition-colors`}
                  >
                    <span className="min-w-0">
                      <span className={`block truncate text-sm font-medium ${live ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{r.title}</span>
                      <span className="block font-mono text-[11px] text-gray-400">{r.id}</span>
                    </span>
                    <span className="hidden sm:block truncate text-xs text-gray-500">{r.isHost ? 'You' : r.hostName}</span>
                    <span className="hidden sm:block">
                      {live ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="relative flex w-1.5 h-1.5">
                            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          </span>
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Ended</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">{formatDistanceToNowStrict(new Date(r.lastSeenAt), { addSuffix: true })}</span>
                    {live ? (
                      <ArrowUpRight className="hidden sm:block w-4 h-4 text-gray-300 group-hover:text-indigo-500 dark:text-gray-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    ) : (
                      <span className="hidden sm:block" />
                    )}
                  </Row>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── closing ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28 pb-24">
        <motion.div
          {...inView()}
          className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-gray-950 text-white px-6 py-14 sm:px-14 text-center"
        >
          <div
            className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_100%,black,transparent)]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
            aria-hidden
          />
          <div className="absolute left-1/2 bottom-[-220px] -translate-x-1/2 w-[640px] h-[360px] rounded-full bg-indigo-500/30 blur-[110px]" aria-hidden />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] [text-wrap:balance]">Stuck on a problem? Bring someone in.</h2>
            <p className="mt-3 mx-auto max-w-md text-slate-400">It takes one link. They land in the same editor and can talk right away.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {signedOut ? (
                <Link href={signInUrl('/playground')} className={`${PRIMARY} h-11 px-5`}>
                  <LogIn className="w-4 h-4" /> Sign in to start
                </Link>
              ) : (
                <button type="button" onClick={() => create()} disabled={busy} className={`${PRIMARY} h-11 px-5`}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Open a room
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  switchMode('join');
                }}
                className="h-11 px-5 rounded-lg text-sm font-medium text-slate-200 border border-white/15 hover:bg-white/[0.06] transition-colors"
              >
                I have a code
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
