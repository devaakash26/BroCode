'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ArrowRight, Code2, PenTool, Video, BookOpen, Sparkles } from 'lucide-react';

/*
 * One-time "Introducing Playground" announcement, 3 seconds after landing.
 * Shown once per browser; never on the playground itself or on focused pages
 * (sign-in, admin, a problem you're solving).
 */
const SEEN_KEY = 'bc-playground-intro-v1';
const DELAY_MS = 3000;
const SKIP = [/^\/playground/, /^\/auth/, /^\/admin/, /^\/maintenance/, /^\/problems\/.+/, /\/challenges\/.+\/test/];

const FEATURES = [
  { icon: Code2, title: 'One editor, live cursors', text: 'C, C++, Java, Python and JavaScript, up to 10 inputs per run.' },
  { icon: PenTool, title: 'An endless scratchpad', text: 'Sketch, add notes, and load any problem statement onto it.' },
  { icon: Video, title: 'Voice, camera and chat', text: 'Talk it through in the same tab. Calls ring everyone in.' },
  { icon: BookOpen, title: 'Submit for real', text: 'Run hidden test cases. Solves count on your profile.' },
];

function Preview() {
  const reduce = useReducedMotion();
  const lines = [70, 52, 84, 46, 66, 38];
  return (
    <div className="relative h-44 sm:h-52 overflow-hidden bg-[#0b0f18]" aria-hidden>
      <div
        className="absolute inset-0 opacity-70"
        style={{ backgroundImage: 'radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
      />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full bg-indigo-600/30 blur-[80px]" />

      <div className="absolute inset-x-5 sm:inset-x-8 top-5 bottom-0 rounded-t-xl bg-[#0f1522] ring-1 ring-white/10 overflow-hidden">
        <div className="flex items-center gap-1.5 h-7 px-3 border-b border-white/[0.06]">
          {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/15" />)}
          <span className="ml-2 text-[10px] font-semibold text-slate-300">DP practice</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
          </span>
          <span className="ml-auto flex -space-x-1.5">
            {['#6366f1', '#ec4899', '#10b981'].map((c, i) => (
              <motion.span
                key={c}
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 500, damping: 20 }}
                className="w-4 h-4 rounded-full ring-2 ring-[#0f1522]"
                style={{ background: c }}
              />
            ))}
          </span>
        </div>
        <div className="grid grid-cols-[2fr_3fr] gap-1.5 p-1.5 h-[calc(100%-1.75rem)]">
          <div className="relative rounded-md bg-[#0b1020] ring-1 ring-white/[0.06]">
            <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full">
              <motion.path
                d="M10 66 h16 v-12 h16 v-12 h16 v-12 h16 v-12"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: 0.4, ease: 'easeInOut' }}
              />
            </svg>
          </div>
          <div className="rounded-md bg-[#0b1020] ring-1 ring-white/[0.06] p-2.5 space-y-2">
            {lines.map((w, i) => (
              <motion.div
                key={i}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${w}%` }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.4, ease: 'easeOut' }}
                className="h-1.5 rounded-sm"
                style={{ background: ['#c084fc', '#e5e7eb', '#93c5fd', '#e5e7eb', '#fbbf24', '#e5e7eb'][i], opacity: 0.7, marginLeft: i % 3 ? 10 : 0 }}
              />
            ))}
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="inline-flex items-center gap-1 mt-1 px-1.5 rounded text-[9px] font-semibold text-white bg-emerald-600"
            >
              8/10 passed
            </motion.span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundAnnouncement({ disabled = false }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (disabled || SKIP.some((re) => re.test(pathname))) return undefined;
    let seen = true;
    try {
      seen = !!localStorage.getItem(SEEN_KEY);
    } catch {}
    if (seen) return undefined;
    timer.current = setTimeout(() => {
      setOpen(true);
      try {
        localStorage.setItem(SEEN_KEY, String(Date.now())); // once per browser
      } catch {}
    }, DELAY_MS);
    return () => clearTimeout(timer.current);
  }, [pathname, disabled]);

  // Navigating away (e.g. via the CTA) closes it.
  useEffect(() => {
    if (open && SKIP.some((re) => re.test(pathname))) setOpen(false);
  }, [pathname, open]);

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="pg-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-black/55 backdrop-blur-[2px]"
          onMouseDown={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pg-intro-title"
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#11151f] ring-1 ring-gray-200 dark:ring-white/10 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <Preview />

            <div className="px-6 pt-6 pb-5 sm:px-7">
              <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-400/20">
                <Sparkles className="w-3 h-3" /> New on BroCode
              </span>
              <h2 id="pg-intro-title" className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-gray-900 dark:text-white">
                Meet Playground
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                A live room for mock interviews and pair practice. Share one link and solve together, with code, sketches and voice in one tab.
              </p>

              <ul className="mt-5 grid sm:grid-cols-2 gap-x-5 gap-y-3.5">
                {FEATURES.map(({ icon: Icon, title, text }, i) => (
                  <motion.li
                    key={title}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    className="flex gap-3"
                  >
                    <span className="mt-0.5 w-8 h-8 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">{title}</span>
                      <span className="block text-xs leading-relaxed text-gray-500 dark:text-gray-400">{text}</span>
                    </span>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 px-4 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] transition-colors"
                >
                  Maybe later
                </button>
                <Link
                  href="/playground"
                  onClick={() => setOpen(false)}
                  className="group sm:ml-auto inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors"
                >
                  Open Playground
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
