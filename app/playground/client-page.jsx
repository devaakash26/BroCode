'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { PenTool, Code2, Video, MessageSquare, Loader2, ArrowRight, Plus, Users, Timer, LogIn } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';
import useSocket from '@/app/hooks/useSocket';

const INPUT =
  'w-full h-10 px-3 rounded-md bg-white dark:bg-[#0a0d14] border border-gray-300 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';
const SURFACE = 'bg-white dark:bg-[#11151f] border border-gray-200 dark:border-white/[0.07]';
const PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition-colors';
const signInUrl = (path) => `/auth/signin?callbackUrl=${encodeURIComponent(path)}`;

const FEATURES = [
  { icon: PenTool, title: 'Scratchpad', text: 'Draw to explain. Everyone sees who is drawing and where.' },
  { icon: Code2, title: 'Shared editor', text: 'C, C++, Java, JavaScript and Python, run against up to 5 inputs.' },
  { icon: Video, title: 'Voice and camera', text: 'Talk it through without leaving the room.' },
  { icon: MessageSquare, title: 'Chat', text: 'Share links, hints and snippets with the room.' },
];

function parseRoomId(input) {
  const v = input.trim();
  const fromUrl = v.match(/playground\/([A-Za-z0-9_-]{6,24})/);
  if (fromUrl) return fromUrl[1];
  return /^[A-Za-z0-9_-]{6,24}$/.test(v) ? v : null;
}

/** Static picture of a room, so people know what they're about to open. */
function RoomPreview() {
  const code = [
    [['#c084fc', 'int'], ['#e5e7eb', ' climb('], ['#c084fc', 'int'], ['#e5e7eb', ' n) {']],
    [['#e5e7eb', '  '], ['#c084fc', 'if'], ['#e5e7eb', ' (n <= '], ['#fbbf24', '2'], ['#e5e7eb', ') '], ['#c084fc', 'return'], ['#e5e7eb', ' n;']],
    [['#e5e7eb', '  '], ['#c084fc', 'int'], ['#e5e7eb', ' a = '], ['#fbbf24', '1'], ['#e5e7eb', ', b = '], ['#fbbf24', '2'], ['#e5e7eb', ';']],
    [['#e5e7eb', '  '], ['#c084fc', 'for'], ['#e5e7eb', ' ('], ['#c084fc', 'int'], ['#e5e7eb', ' i = '], ['#fbbf24', '3'], ['#e5e7eb', '; i <= n; i++)']],
    [['#e5e7eb', '    tie(a, b) = '], ['#93c5fd', 'pair'], ['#e5e7eb', '(b, a + b);']],
    [['#e5e7eb', '  '], ['#c084fc', 'return'], ['#e5e7eb', ' b;']],
    [['#e5e7eb', '}']],
  ];
  return (
    <div className="h-full rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-[#0a0d14] flex flex-col text-[11px] select-none" aria-hidden>
      {/* bar */}
      <div className="flex items-center gap-2 h-9 px-3 border-b border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0d1119]">
        <span className="font-semibold text-gray-800 dark:text-gray-100">DP practice</span>
        <span className="inline-flex items-center gap-1 text-red-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Live
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-gray-500">
          <Timer className="w-3 h-3" /> 12:48
        </span>
        <div className="flex-1" />
        <div className="flex -space-x-1.5">
          {[['A', '#6366f1'], ['R', '#ec4899'], ['S', '#10b981']].map(([l, c]) => (
            <span key={l} className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-[#0d1119] text-[9px] font-bold text-white flex items-center justify-center" style={{ background: c }}>
              {l}
            </span>
          ))}
        </div>
        <span className="text-gray-500 tabular-nums">3/10</span>
      </div>
      {/* body */}
      <div className="flex-1 min-h-0 grid grid-cols-[2fr_3fr] gap-1.5 p-1.5">
        <div
          className="relative rounded-md border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-[#0b1020] overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(rgba(148,163,184,0.25) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
        >
          <svg viewBox="0 0 200 160" className="absolute inset-0 w-full h-full">
            {/* staircase sketch */}
            <path d="M20 130 h30 v-22 h30 v-22 h30 v-22 h30 v-22" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M40 120 q10 -18 22 -20" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M58 96 l4 4 -6 1" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <text x="192" y="148" textAnchor="end" fontSize="10" fill="currentColor" className="text-gray-500 dark:text-gray-400" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif">
              f(n) = f(n-1) + f(n-2)
            </text>
          </svg>
          <div className="absolute" style={{ left: '62%', top: '30%' }}>
            <PenTool className="w-3 h-3 -translate-y-full text-pink-500" />
            <span className="absolute left-2.5 top-0 whitespace-nowrap rounded bg-pink-500 px-1 text-[9px] font-medium text-white">Riya</span>
          </div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-white/[0.07] bg-[#0b1020] overflow-hidden flex flex-col">
          <div className="flex-1 px-2.5 py-2 font-mono text-[10.5px] leading-[1.6]">
            {code.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-4 text-right mr-2.5 text-slate-600">{i + 1}</span>
                <span className="whitespace-pre">
                  {line.map(([c, t], j) => (
                    <span key={j} style={{ color: c }}>{t}</span>
                  ))}
                  {i === 4 && (
                    <span className="relative inline-block w-0 h-3 align-middle border-l-2 border-emerald-500">
                      <span className="absolute -top-3 left-[-2px] rounded-sm bg-emerald-500 px-1 text-[8px] leading-3 font-sans font-medium text-white">Sam</span>
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 border-t border-white/[0.07] text-[10px]">
            <div className="px-2.5 py-1.5 border-r border-white/[0.07] font-mono text-slate-400">5</div>
            <div className="px-2.5 py-1.5 font-mono text-slate-200 flex items-center justify-between">
              8 <span className="font-sans text-emerald-400">Accepted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundHome() {
  const router = useRouter();
  const { socket, isConnected, lastError } = useSocket();
  const { data: session, status: sessionStatus } = useSession();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [recent, setRecent] = useState(null); // null = loading
  const titleRef = useRef(null);
  const codeRef = useRef(null);

  const signedOut = sessionStatus === 'unauthenticated';

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
    setCreating(true);
    const attempt = (retry) =>
      socket.timeout(8000).emit('pg:create', { title }, (err, res) => {
        if (err) {
          setCreating(false);
          return toast.error('Live server did not respond — is the socket server running the latest code?');
        }
        // The socket may not be identified for a split second after connecting.
        if (res?.error === 'not_identified' && retry) return setTimeout(() => attempt(false), 600);
        if (!res?.ok) {
          setCreating(false);
          return toast.error('Could not create playground');
        }
        router.push(`/playground/${res.roomId}`);
      });
    attempt(true);
  };

  const join = (e) => {
    e.preventDefault();
    const id = parseRoomId(code);
    if (!id) return toast.error('Paste a playground link or code');
    router.push(signedOut ? signInUrl(`/playground/${id}`) : `/playground/${id}`);
  };

  const busy = creating || (!isConnected && !signedOut);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 border-b border-gray-200 dark:border-white/[0.07]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Playground</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            A shared room to code, draw and talk through problems together.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => codeRef.current?.focus()}
            className="h-9 px-3.5 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            Join with code
          </button>
          {signedOut ? (
            <Link href={signInUrl('/playground')} className={`${PRIMARY} h-9 px-3.5`}>
              <LogIn className="w-4 h-4" /> Sign in
            </Link>
          ) : (
            <button type="button" onClick={() => create()} disabled={busy} className={`${PRIMARY} h-9 px-3.5`}>
              <Plus className="w-4 h-4" /> New session
            </button>
          )}
        </div>
      </div>

      {/* Start / join + preview */}
      <div className={`mt-6 rounded-xl overflow-hidden ${SURFACE} grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`}>
        <div className="p-6 flex flex-col">
          <form onSubmit={create}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Start a session</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You&apos;ll be the host. The timer starts when the room opens.
            </p>
            <label className="mt-5 block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="pg-title">
              Session name <span className="font-normal text-gray-400">· optional</span>
            </label>
            <input
              id="pg-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="e.g. DP practice"
              className={INPUT}
            />
            {signedOut ? (
              <>
                <Link href={signInUrl('/playground')} className={`${PRIMARY} mt-3 w-full h-10`}>
                  <LogIn className="w-4 h-4" /> Sign in to create a playground
                </Link>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  You need an account to host or join sessions.{' '}
                  <Link href="/auth/signup" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    Create one
                  </Link>
                </p>
              </>
            ) : (
              <button type="submit" disabled={busy} className={`${PRIMARY} mt-3 w-full h-10 gap-2`}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {sessionStatus === 'loading' ? 'Loading…' : isConnected ? 'Create playground' : 'Connecting…'}
              </button>
            )}
            {!isConnected && sessionStatus === 'authenticated' && (
              <p className="mt-2 text-[11px] text-gray-400 font-mono break-all">
                {!session?.user?.id
                  ? 'session: signed in but user id missing'
                  : `socket: ${socket ? 'connecting' : 'not started'} → ${process.env.NEXT_PUBLIC_SOCKET_URL || '(no NEXT_PUBLIC_SOCKET_URL)'}${lastError ? ` · error: ${lastError}` : ''}`}
              </p>
            )}
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex-1 h-px bg-gray-200 dark:bg-white/[0.07]" />
            or join one
            <span className="flex-1 h-px bg-gray-200 dark:bg-white/[0.07]" />
          </div>

          <form onSubmit={join}>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="pg-code">
              Invite link or room code
            </label>
            <div className="flex gap-2">
              <input
                id="pg-code"
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="abc123"
                className={`${INPUT} font-mono`}
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-md text-sm font-medium text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors flex-shrink-0"
              >
                Join
              </button>
            </div>
          </form>

          <dl className="mt-auto pt-6 grid grid-cols-3 gap-4 text-center">
            {[['10', 'people per room'], ['5', 'languages'], ['5', 'inputs per run']].map(([v, l]) => (
              <div key={l} className="py-2">
                <dt className="sr-only">{l}</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">{v}</dd>
                <dd className="text-xs text-gray-500 dark:text-gray-400">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hidden lg:block p-3 bg-gray-50 dark:bg-[#0d1119] border-l border-gray-200 dark:border-white/[0.07] min-h-[380px]">
          <RoomPreview />
        </div>
      </div>

      {/* Recent */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent sessions</h2>
          
        </div>
        {recent === null ? (
          <div className={`rounded-lg ${SURFACE} divide-y divide-gray-200 dark:divide-white/[0.07]`}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 px-4 flex items-center gap-4">
                <span className="h-3 w-40 rounded bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
                <span className="ml-auto h-3 w-20 rounded bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className={`rounded-lg ${SURFACE} px-6 py-10 text-center`}>
            <Users className="mx-auto w-5 h-5 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {signedOut ? (
                <>
                  <Link href={signInUrl('/playground')} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    Sign in
                  </Link>{' '}
                  to see the sessions you host or join.
                </>
              ) : (
                'Sessions you host or join will show up here.'
              )}
            </p>
          </div>
        ) : (
          <div className={`rounded-lg overflow-hidden ${SURFACE}`}>
            <div className="hidden sm:grid grid-cols-[1fr_120px_90px_130px_24px] gap-4 px-4 h-9 items-center text-[11px] font-medium uppercase tracking-wide text-gray-400 border-b border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02]">
              <span>Name</span>
              <span>Host</span>
              <span>Status</span>
              <span>Last active</span>
              <span />
            </div>
            {recent.map((r) => {
              const live = r.status === 'ACTIVE';
              const Row = live ? Link : 'div';
              return (
                <Row
                  key={r.id}
                  {...(live ? { href: `/playground/${r.id}` } : {})}
                  className={`group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_90px_130px_24px] gap-4 px-4 h-12 items-center border-b last:border-0 border-gray-200 dark:border-white/[0.07] ${live ? 'hover:bg-gray-50 dark:hover:bg-white/[0.03]' : ''} transition-colors`}
                >
                  <span className="min-w-0">
                    <span className={`block truncate text-sm font-medium ${live ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{r.title}</span>
                    <span className="block font-mono text-[11px] text-gray-400">{r.id}</span>
                  </span>
                  <span className="hidden sm:block truncate text-xs text-gray-500">{r.isHost ? 'You' : r.hostName}</span>
                  <span className="hidden sm:block">
                    {live ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Ended</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">{formatDistanceToNowStrict(new Date(r.lastSeenAt), { addSuffix: true })}</span>
                  {live ? (
                    <ArrowRight className="hidden sm:block w-4 h-4 text-gray-300 group-hover:text-gray-600 dark:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </Row>
              );
            })}
          </div>
        )}
      </section>

      {/* What's inside */}
      <section className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.07] bg-gray-200 dark:bg-white/[0.07]">
        {FEATURES.map(({ icon: Icon, title: t, text }) => (
          <div key={t} className="p-5 bg-white dark:bg-[#11151f]">
            <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">{t}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
