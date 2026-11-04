'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PenTool, Code2, Play, Pause, MessageSquare, Mic, Timer, Check, Loader2 } from 'lucide-react';

/*
 * A scripted replay of a playground session. Everything is driven by one
 * clock `t` (ms), so the player can pause, seek and loop like a video.
 */

const DURATION = 26000;

const PEOPLE = {
  you: { name: 'You', short: 'A', color: '#6366f1' },
  riya: { name: 'Riya', short: 'R', color: '#ec4899' },
  sam: { name: 'Sam', short: 'S', color: '#10b981' },
};

export const CHAPTERS = [
  { key: 'sketch', start: 0, end: 6500, icon: PenTool, title: 'Sketch it', text: 'Draw on the scratchpad. Everyone sees who is drawing and where.' },
  { key: 'code', start: 6500, end: 15000, icon: Code2, title: 'Write it together', text: 'One editor, live cursors. C, C++, Java, JavaScript or Python.' },
  { key: 'run', start: 15000, end: 20500, icon: Play, title: 'Run it', text: 'Run against up to 10 inputs at once and see each result.' },
  { key: 'talk', start: 20500, end: DURATION, icon: MessageSquare, title: 'Talk it through', text: 'Voice, camera and chat inside the room, no extra tabs.' },
];

const CAPTIONS = [
  { from: 700, to: 5900, who: 'riya', text: 'Every step is reached from one or two steps below.' },
  { from: 7000, to: 10800, who: 'sam', text: 'So we only need the last two values. Typing it.' },
  { from: 11200, to: 14600, who: 'sam', text: 'Shift both forward on every round.' },
  { from: 15300, to: 18300, who: 'you', text: 'Running it on 2, 5 and 10.' },
  { from: 18700, to: 20400, who: 'riya', text: 'Clean. All three pass.' },
];

const CHAT = [
  { at: 21000, who: 'riya', text: "so it's fibonacci, shifted by one" },
  { at: 22600, who: 'sam', text: 'yep, and O(1) space' },
  { at: 24200, who: 'you', text: 'house robber next?' },
];

const TESTS = [
  { input: 'n = 2', out: '2', ms: '0.6' },
  { input: 'n = 5', out: '8', ms: '0.7' },
  { input: 'n = 10', out: '89', ms: '0.9' },
];
const TEST_START = 15700;
const TEST_GAP = 900;
const TEST_RUN = 650;

const K = '#c084fc';
const T = '#e5e7eb';
const N = '#fbbf24';
const F = '#93c5fd';
const C = '#64748b';
const CODE = [
  [[C, '// climbing stairs']],
  [[K, 'int'], [T, ' climb('], [K, 'int'], [T, ' n) {']],
  [[T, '  '], [K, 'if'], [T, ' (n <= '], [N, '2'], [T, ') '], [K, 'return'], [T, ' n;']],
  [[T, '  '], [K, 'int'], [T, ' a = '], [N, '1'], [T, ', b = '], [N, '2'], [T, ';']],
  [[T, '  '], [K, 'for'], [T, ' ('], [K, 'int'], [T, ' i = '], [N, '3'], [T, '; i <= n; i++)']],
  [[T, '    tie(a, b) = '], [F, 'pair'], [T, '(b, a + b);']],
  [[T, '  '], [K, 'return'], [T, ' b;']],
  [[T, '}']],
];
const TYPE_FROM = 6900;
const TYPE_TO = 13900;
const TOTAL_CHARS = CODE.reduce((s, l) => s + l.reduce((a, [, x]) => a + x.length, 0) + 1, 0);

const clamp = (v) => Math.min(1, Math.max(0, v));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function useClock(playing) {
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const tick = (now) => {
      // Cap the step so returning to a background tab doesn't skip a chapter.
      tRef.current = (tRef.current + Math.min(now - last, 64)) % DURATION;
      last = now;
      setT(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const seek = (v) => {
    tRef.current = Math.max(0, Math.min(DURATION - 1, v));
    setT(tRef.current);
  };
  return [t, seek];
}

function Avatar({ who, speaking, size = 20 }) {
  const p = PEOPLE[who];
  return (
    <span className="relative inline-flex">
      {speaking && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 2px ${p.color}` }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0, 0.9] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span
        className="relative rounded-full ring-2 ring-[#0d1119] font-bold text-white flex items-center justify-center"
        style={{ background: p.color, width: size, height: size, fontSize: size * 0.45 }}
      >
        {p.short}
      </span>
    </span>
  );
}

function Waveform({ t, color, active }) {
  return (
    <span className="inline-flex items-center gap-[2px] h-3" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const h = active ? 3 + Math.abs(Math.sin(t / 140 + i * 1.7) * Math.cos(t / 330 + i)) * 9 : 2;
        return <span key={i} className="w-[2px] rounded-full transition-[height] duration-75" style={{ height: h, background: color }} />;
      })}
    </span>
  );
}

/* ---------- scratchpad ---------- */

function Scratchpad({ t }) {
  const stairRef = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (stairRef.current) setLen(stairRef.current.getTotalLength());
  }, []);

  const stair = easeOut(prog(t, 600, 3600));
  const arc1 = prog(t, 3700, 4300);
  const arc2 = prog(t, 4300, 4900);
  const formulaChars = Math.floor(prog(t, 5000, 6200) * 22);
  const ring = prog(t, 19000, 19900);

  const pen = len && stairRef.current ? stairRef.current.getPointAtLength(len * stair) : { x: 20, y: 150 };
  // Riya's pen trails the stroke, then drifts down toward the formula.
  const drift = easeOut(prog(t, 4900, 5600));
  const penX = pen.x + (120 - pen.x) * drift;
  const penY = pen.y + (150 - pen.y) * drift;
  const penOn = t > 300 && t < 6800;

  // Your cursor draws the jump arcs.
  const youOn = t > 3400 && t < 5400;
  const youX = arc2 > 0 ? 56 + 72 * arc2 : 56 + 36 * arc1;
  const youY = arc2 > 0 ? 124 - 52 * arc2 - Math.sin(arc2 * Math.PI) * 26 : 124 - 26 * arc1 - Math.sin(arc1 * Math.PI) * 18;

  const formula = 'f(n) = f(n-1) + f(n-2)'.slice(0, formulaChars);

  return (
    <div
      className="relative h-full rounded-md border border-white/[0.07] bg-[#0b1020] overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
    >
      <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-white/[0.04] border border-white/[0.06] p-0.5">
        {['#ef4444', '#3b82f6', '#e5e7eb'].map((c, i) => (
          <span key={c} className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${i === 0 ? 'bg-white/10' : ''}`}>
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
          </span>
        ))}
      </div>
      <svg viewBox="0 0 220 180" className="absolute inset-0 w-full h-full">
        <path
          ref={stairRef}
          d="M20 150 h36 v-26 h36 v-26 h36 v-26 h36 v-26"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - stair}
        />
        {[
          ['M56 124 Q74 96 92 98', arc1, '+1', 70, 98],
          ['M56 124 Q92 54 128 72', arc2, '+2', 90, 66],
        ].map(([d, p, label, lx, ly]) => (
          <g key={label}>
            <path d={d} fill="none" stroke="#818cf8" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1" pathLength="1" strokeDashoffset={1 - p} />
            <text x={lx} y={ly} fontSize="8" fill="#a5b4fc" opacity={p > 0.9 ? 1 : 0} style={{ transition: 'opacity .3s' }} fontFamily="ui-monospace, monospace">
              {label}
            </text>
          </g>
        ))}
        <text x="120" y="164" textAnchor="middle" fontSize="10" fill="#cbd5e1" fontFamily="ui-monospace, SFMono-Regular, monospace">
          {formula}
        </text>
        <ellipse
          cx="120"
          cy="160"
          rx="70"
          ry="12"
          fill="none"
          stroke="#ec4899"
          strokeWidth="1.4"
          strokeDasharray="1"
          pathLength="1"
          strokeDashoffset={1 - ring}
          transform="rotate(-3 120 160)"
        />

        {penOn && (
          <g transform={`translate(${penX} ${penY})`} style={{ transition: 'opacity .2s' }}>
            <path d="M0 0 l-2 -9 l5 3 z" fill={PEOPLE.riya.color} />
            <rect x="5" y="-17" width="24" height="10" rx="2" fill={PEOPLE.riya.color} />
            <text x="17" y="-9.6" textAnchor="middle" fontSize="6.5" fill="white" fontFamily="system-ui, sans-serif" fontWeight="600">
              Riya
            </text>
          </g>
        )}
        {youOn && (
          <g transform={`translate(${youX} ${youY})`}>
            <path d="M0 0 l0 9 l2.6 -2.4 l3.4 -0.2 z" fill={PEOPLE.you.color} />
            <rect x="6" y="6" width="20" height="10" rx="2" fill={PEOPLE.you.color} />
            <text x="16" y="13.4" textAnchor="middle" fontSize="6.5" fill="white" fontFamily="system-ui, sans-serif" fontWeight="600">
              You
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ---------- editor ---------- */

function Editor({ t }) {
  const typed = Math.floor(prog(t, TYPE_FROM, TYPE_TO) * TOTAL_CHARS);
  let left = typed;
  let caretLine = 0;
  const lines = CODE.map((line, i) => {
    if (left <= 0) return null;
    caretLine = i;
    const out = [];
    for (const [c, txt] of line) {
      if (left <= 0) break;
      const piece = txt.slice(0, left);
      left -= piece.length;
      out.push([c, piece]);
    }
    left -= 1; // newline
    return out;
  });
  const done = typed >= TOTAL_CHARS;
  const highlight = prog(t, 14100, 14700);
  const running = t >= 15000 && t < TEST_START + TEST_GAP * 2 + TEST_RUN;

  return (
    <div className="h-full rounded-md border border-white/[0.07] bg-[#0b1020] overflow-hidden flex flex-col">
      <div className="flex items-center h-7 px-2 border-b border-white/[0.06] text-[10px] text-slate-400 gap-2">
        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-mono">main.cpp</span>
        <span className="font-mono">C++17</span>
        <span className="flex-1" />
        <motion.span
          animate={t >= 15000 && t < 15250 ? { scale: 0.9 } : { scale: 1 }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${running ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-600 text-white'}`}
        >
          {running ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5 fill-current" />}
          Run
        </motion.span>
      </div>
      <div className="relative flex-1 px-2.5 py-2 font-mono text-[10.5px] sm:text-[11.5px] leading-[1.7] overflow-hidden">
        {CODE.map((_, i) => (
          <div key={i} className="relative flex">
            {i === 5 && highlight > 0 && (
              <span
                className="absolute inset-y-0 left-7 bg-indigo-500/20 border-l-2 border-indigo-400"
                style={{ width: `${highlight * 70}%` }}
              />
            )}
            <span className="relative w-4 text-right mr-3 text-slate-600 select-none">{i + 1}</span>
            <span className="relative whitespace-pre">
              {lines[i]?.map(([c, txt], j) => (
                <span key={j} style={{ color: c }}>
                  {txt}
                </span>
              ))}
              {i === caretLine && t >= TYPE_FROM - 400 && t < 15000 && (
                <span className="relative inline-block w-0 h-3.5 align-middle border-l-2 border-emerald-400">
                  <span className="absolute -top-3.5 -left-[2px] rounded-sm bg-emerald-500 px-1 text-[8px] leading-[13px] font-sans font-semibold text-white">
                    Sam
                  </span>
                </span>
              )}
            </span>
          </div>
        ))}
        {!done && t < TYPE_FROM && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-600 font-sans">waiting for someone to type…</div>
        )}
      </div>
      <Tests t={t} />
    </div>
  );
}

function Tests({ t }) {
  const allDone = t > TEST_START + TEST_GAP * 2 + TEST_RUN;
  return (
    <div className="border-t border-white/[0.07] text-[10px] font-mono">
      <div className="flex items-center h-6 px-2.5 text-slate-500 font-sans gap-3">
        <span className="text-slate-300 font-medium">Tests</span>
        <span>input</span>
        <span className="flex-1" />
        <AnimatePresence>
          {allDone && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-emerald-400 font-semibold">
              3/3 passed · Accepted
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {TESTS.map((tc, i) => {
        const start = TEST_START + i * TEST_GAP;
        const state = t < 15000 ? 'idle' : t < start ? 'queued' : t < start + TEST_RUN ? 'running' : 'pass';
        return (
          <div key={tc.input} className="grid grid-cols-[16px_1fr_1fr_auto] items-center gap-2 h-6 px-2.5 border-t border-white/[0.04]">
            <span className="flex items-center">
              {state === 'pass' ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check className="w-2 h-2 text-emerald-400" strokeWidth={4} />
                </motion.span>
              ) : state === 'running' ? (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${state === 'queued' ? 'bg-slate-500' : 'bg-slate-700'}`} />
              )}
            </span>
            <span className="text-slate-400">{tc.input}</span>
            <span className={state === 'pass' ? 'text-slate-100' : 'text-slate-600'}>{state === 'pass' ? `→ ${tc.out}` : '—'}</span>
            <span className="text-slate-500 tabular-nums">{state === 'pass' ? `${tc.ms} ms` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- chat ---------- */

function Chat({ t }) {
  const open = t >= 20600;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '105%' }}
          animate={{ x: 0 }}
          exit={{ x: '105%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="absolute top-1.5 right-1.5 bottom-1.5 w-[46%] sm:w-56 rounded-md border border-white/[0.08] bg-[#0d1220]/95 backdrop-blur flex flex-col z-10"
        >
          <div className="h-7 px-2.5 flex items-center gap-1.5 border-b border-white/[0.06] text-[10px] font-medium text-slate-300">
            <MessageSquare className="w-3 h-3" /> Room chat
          </div>
          <div className="flex-1 p-2 flex flex-col justify-end gap-1.5 overflow-hidden">
            {CHAT.filter((m) => t >= m.at).map((m) => {
              const p = PEOPLE[m.who];
              const mine = m.who === 'you';
              return (
                <motion.div
                  key={m.at}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className={`max-w-[92%] ${mine ? 'self-end' : 'self-start'}`}
                >
                  {!mine && (
                    <span className="block text-[9px] font-semibold mb-0.5" style={{ color: p.color }}>
                      {p.name}
                    </span>
                  )}
                  <span className={`block rounded-md px-2 py-1 text-[10.5px] leading-snug ${mine ? 'bg-indigo-600 text-white' : 'bg-white/[0.06] text-slate-200'}`}>
                    {m.text}
                  </span>
                </motion.div>
              );
            })}
            {t >= 23700 && t < 24200 && (
              <span className="self-end text-[9px] text-slate-500 italic">you are typing…</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- player ---------- */

export default function SessionReplay() {
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const [userPlaying, setUserPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const [t, seek] = useClock(userPlaying && inView);

  // Reduced motion: hold on a finished frame until someone presses play.
  useEffect(() => {
    if (reduce) {
      setUserPlaying(false);
      seek(DURATION - 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const chapterIdx = CHAPTERS.findIndex((c) => t >= c.start && t < c.end);
  const caption = CAPTIONS.find((c) => t >= c.from && t < c.to);
  const speaker = caption?.who ?? (t >= 20600 ? 'you' : null);

  const onScrub = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * DURATION);
  };

  return (
    <div ref={rootRef}>
      <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-white/[0.14] to-white/[0.03] shadow-[0_40px_120px_-40px_rgba(79,70,229,0.55)]">
        <div className="rounded-[15px] overflow-hidden bg-[#0d1119] text-[11px] select-none">
          {/* room bar */}
          <div className="flex items-center gap-2.5 h-10 px-3 sm:px-4 border-b border-white/[0.07]">
            <span className="hidden sm:flex gap-1.5 mr-1" aria-hidden>
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </span>
            <span className="font-semibold text-slate-100 text-xs">DP practice</span>
            <span className="inline-flex items-center gap-1 text-red-400 font-medium">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" />
              </span>
              Live
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-slate-500">
              <Timer className="w-3 h-3" /> {fmt(768000 + t)}
            </span>
            <span className="flex-1" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-500">
              <Mic className="w-3 h-3" />
              <Waveform t={t} color={speaker ? PEOPLE[speaker].color : '#475569'} active={!!speaker && userPlaying} />
            </span>
            <div className="flex -space-x-1.5">
              {Object.keys(PEOPLE).map((k) => (
                <Avatar key={k} who={k} speaking={speaker === k && userPlaying} />
              ))}
            </div>
            <span className="text-slate-500 tabular-nums">3/10</span>
          </div>

          {/* panes */}
          <div className="relative grid grid-rows-[170px_auto] sm:grid-rows-1 sm:grid-cols-[2fr_3fr] gap-1.5 p-1.5 sm:h-[400px] lg:h-[440px]">
            <Scratchpad t={t} />
            <Editor t={t} />
            <Chat t={t} />

            {/* caption */}
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4 z-20">
              <AnimatePresence mode="wait">
                {caption && (
                  <motion.div
                    key={caption.from}
                    initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="max-w-md rounded-md bg-black/75 px-3 py-1.5 text-[11.5px] sm:text-xs text-white text-center leading-snug"
                  >
                    <span className="font-semibold" style={{ color: PEOPLE[caption.who].color }}>
                      {PEOPLE[caption.who].name}:
                    </span>{' '}
                    {caption.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* transport */}
          <div className="flex items-center gap-3 h-11 px-3 sm:px-4 border-t border-white/[0.07] bg-[#0a0d14]">
            <button
              type="button"
              onClick={() => setUserPlaying((p) => !p)}
              className="w-7 h-7 rounded-full bg-white text-gray-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              aria-label={userPlaying ? 'Pause replay' : 'Play replay'}
            >
              {userPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current translate-x-[1px]" />}
            </button>
            <span className="font-mono text-[10.5px] text-slate-400 tabular-nums">
              {fmt(t)} <span className="text-slate-600">/ {fmt(DURATION)}</span>
            </span>
            <div
              className="group flex-1 flex items-center gap-1 h-6 cursor-pointer"
              onClick={onScrub}
              role="slider"
              aria-label="Seek replay"
              aria-valuemin={0}
              aria-valuemax={DURATION}
              aria-valuenow={Math.round(t)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') seek(t + 2000);
                if (e.key === 'ArrowLeft') seek(t - 2000);
              }}
            >
              {CHAPTERS.map((c) => (
                <span
                  key={c.key}
                  className="relative h-1 group-hover:h-1.5 transition-all rounded-full bg-white/10 overflow-hidden"
                  style={{ flexGrow: c.end - c.start }}
                >
                  <span className="absolute inset-y-0 left-0 bg-indigo-400 rounded-full" style={{ width: `${prog(t, c.start, c.end) * 100}%` }} />
                </span>
              ))}
            </div>
            <span className="hidden sm:block w-28 text-right text-[10.5px] text-slate-400 truncate">{CHAPTERS[chapterIdx]?.title}</span>
          </div>
        </div>
      </div>

      {/* chapters */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
        {CHAPTERS.map((c, i) => {
          const active = i === chapterIdx;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                seek(c.start + 1);
                setUserPlaying(true);
              }}
              className="group text-left"
            >
              <span className="block h-px bg-gray-200 dark:bg-white/[0.08] relative overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 bg-indigo-500"
                  style={{ width: active ? `${prog(t, c.start, c.end) * 100}%` : t >= c.end ? '100%' : '0%', opacity: active ? 1 : 0.35 }}
                />
              </span>
              <span className={`mt-4 flex items-center gap-2 text-sm font-medium transition-colors ${active ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-300'}`}>
                <Icon className={`w-4 h-4 transition-colors ${active ? 'text-indigo-500 dark:text-indigo-400' : ''}`} />
                <span className="font-mono text-[11px] text-gray-400 dark:text-gray-600">0{i + 1}</span>
                {c.title}
              </span>
              <span className={`mt-1.5 block text-sm leading-relaxed transition-colors ${active ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-600'}`}>
                {c.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
